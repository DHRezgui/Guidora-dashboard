import { DEFAULT_FAQ_PROJECT_KEY } from './faq-project';
import type { ProjectListItem } from './api';

export type DashboardHubStats = {
  projectCount: number;
  sdkPackCount: number;
  faqTotal: number;
  blueprintTotal: number;
};

export function aggregateDashboardHubStats(projects: ProjectListItem[]): DashboardHubStats {
  return projects.reduce(
    (acc, project) => ({
      projectCount: acc.projectCount + 1,
      sdkPackCount:
        acc.sdkPackCount + (project.projectKey === DEFAULT_FAQ_PROJECT_KEY ? 0 : 1),
      faqTotal: acc.faqTotal + project.faqCount,
      blueprintTotal: acc.blueprintTotal + project.blueprintCount,
    }),
    {
      projectCount: 0,
      sdkPackCount: 0,
      faqTotal: 0,
      blueprintTotal: 0,
    },
  );
}
