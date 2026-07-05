import { PLUGIN_ID } from "./configs/constant";
import { BreadcrumbsPlugin } from "./breadcrumbsPlugin";
import { createBreadcrumbsSettings } from "./settings/breadcrumbsSettings";

const myBreadcrumbs = new BreadcrumbsPlugin();
const breadcrumbsSettings = createBreadcrumbsSettings(myBreadcrumbs);

acode.setPluginInit(
  PLUGIN_ID,
  async (baseUrl: string, $page: any, cache: any) => {
    await myBreadcrumbs.init(baseUrl, $page, cache);
  },
  breadcrumbsSettings,
);

acode.setPluginUnmount(PLUGIN_ID, () => {
  myBreadcrumbs.destroy();
});
