import { Activity } from "@/models/activity.model";

export const activitiesData: Activity[] = [
  {
    id: "1",
    startTime: new Date(1717849899 * 1000),
    endTime: new Date(1717851339 * 1000),
    activityName: "Deep Learning",
    activityType: "Learning",
  },
  {
    id: "2",
    startTime: new Date(1717386692 * 1000),
    endTime: new Date(1717397492 * 1000),
    activityName: "Job Search",
    activityType: "Job Search",
  },
  {
    id: "3",
    startTime: new Date(1718864409 * 1000),
    endTime: new Date(1718878809 * 1000),
    activityName: "Web Project",
    activityType: "Coding",
  },
  {
    id: "4",
    startTime: new Date(1719189923 * 1000),
    endTime: new Date(1719204323 * 1000),
    activityName: "Puppeteer",
    activityType: "Learning",
  },
  {
    id: "5",
    startTime: new Date(1718394188 * 1000),
    endTime: new Date(1718397788 * 1000),
    activityName: "Job Search",
    activityType: "Job Search",
  },
];
