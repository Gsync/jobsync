pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        APP_DIR = credentials('jobsync-app-dir')
        IMAGE = credentials('jobsync-image')
        NPM_CACHE_DIR = credentials('jobsync-npm-cache-dir')
        BRANCH = 'dev'
        CI_CONTAINER = "ci-${BUILD_NUMBER}"
    }

    stages {

        stage('Update Repository') {
            steps {
                dir("${APP_DIR}") {
                    sh '''
                        set -e

                        git fetch origin
                        git checkout ${BRANCH}
                        git pull origin ${BRANCH}
                    '''
                }
            }
        }

        stage('Start CI Container') {
            steps {
                dir("${APP_DIR}") {
                    sh '''
                        set -e

                        mkdir -p ${NPM_CACHE_DIR}

                        docker rm -f ${CI_CONTAINER} 2>/dev/null || true

                        docker run -d --name ${CI_CONTAINER} \
                            -v "$PWD":/app -w /app \
                            -v ${NPM_CACHE_DIR}:/root/.npm \
                            node:24.22.2-alpine tail -f /dev/null

                        docker exec ${CI_CONTAINER} sh -c '
                            set -e
                            HASH_FILE="/root/.npm/last-lockfile.sha256"
                            CURRENT_HASH=$(sha256sum package-lock.json | cut -d" " -f1)
                            if [ -d node_modules ] && [ -f "$HASH_FILE" ] && [ "$(cat $HASH_FILE)" = "$CURRENT_HASH" ]; then
                                echo "package-lock.json unchanged, skipping npm ci"
                            else
                                npm ci --prefer-offline --no-audit --no-fund
                                echo "$CURRENT_HASH" > "$HASH_FILE"
                            fi
                        '
                    '''
                }
            }
        }

        stage('Prisma Generate') {
            steps {
                dir("${APP_DIR}") {
                    sh 'docker exec ${CI_CONTAINER} npx prisma generate'
                }
            }
        }

        stage('Type Check') {
            steps {
                dir("${APP_DIR}") {
                    sh 'docker exec ${CI_CONTAINER} npx tsc --noEmit'
                }
            }
        }

        stage('ESLint') {
            steps {
                dir("${APP_DIR}") {
                    sh 'docker exec ${CI_CONTAINER} npm run lint'
                }
            }
        }

        stage('Vitest') {
            steps {
                dir("${APP_DIR}") {
                    sh 'docker exec ${CI_CONTAINER} npm run test -- --maxWorkers=2'
                }
            }
        }

        stage('Integration Tests') {
            steps {
                dir("${APP_DIR}") {
                    sh '''
                        set -e

                        docker exec ${CI_CONTAINER} node --env-file-if-exists=.env -e '
                            if (!process.env.BACKUP_TEST_DATABASE_URL) {
                                throw new Error("Set BACKUP_TEST_DATABASE_URL in the homelab .env");
                            }
                        '
                        docker exec ${CI_CONTAINER} npm run test:integration -- --maxWorkers=2
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                dir("${APP_DIR}") {
                    // Empty on a first build; the tag moves once the build finishes
                    script {
                        env.OLD_IMAGE_ID = sh(returnStdout: true, script: 'docker image inspect -f "{{.Id}}" ${IMAGE} 2>/dev/null || true').trim()
                    }
                    sh '''
                        set -e

                        docker build \
                            -t ${IMAGE} \
                            .
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                dir("${APP_DIR}") {
                    sh '''
                        set -e

                        # An explicit -f overrides COMPOSE_FILE, so pass none
                        # when .env already names the files.
                        if grep -qE '^[[:space:]]*COMPOSE_FILE=' .env 2>/dev/null; then
                            docker compose up -d --force-recreate --remove-orphans
                        else
                            docker compose \
                                -f docker-compose.yml \
                                -f docker-compose.otel.yml \
                                up -d \
                                --force-recreate \
                                --remove-orphans
                        fi
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                dir("${APP_DIR}") {
                    sh '''
                        set -e

                        i=0
                        until docker compose exec -T app wget --spider -q http://127.0.0.1:3737; do
                            i=$((i+1))
                            if [ "$i" -ge 30 ]; then
                                echo "App did not become reachable in time."
                                docker compose logs --tail=40
                                exit 1
                            fi
                            sleep 10
                        done
                    '''
                }
            }
        }

        stage('Remove Old Image') {
            steps {
                sh '''
                    set -e

                    NEW_IMAGE_ID=$(docker image inspect -f '{{.Id}}' ${IMAGE})
                    if [ -z "${OLD_IMAGE_ID}" ] || [ "${OLD_IMAGE_ID}" = "$NEW_IMAGE_ID" ]; then
                        echo "No old image to remove."
                        exit 0
                    fi

                    # No -f: an image a container still uses is refused, not forced
                    docker rmi "${OLD_IMAGE_ID}" || echo "Old image still in use; left in place."
                '''
            }
        }

    }

    post {
        always {
            sh 'docker rm -f ${CI_CONTAINER} 2>/dev/null || true'
        }

        success {
            echo '✅ Deployment completed successfully.'
        }

        failure {
            echo '❌ Deployment failed.'
        }
    }
}
