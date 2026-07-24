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
                            node:20.20.2-alpine tail -f /dev/null

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

        stage('Build Docker Image') {
            steps {
                dir("${APP_DIR}") {
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

                        docker compose up -d \
                            --force-recreate \
                            --remove-orphans
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
