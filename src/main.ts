import { PLUGIN_ID } from "./configs/constant";
import { BreadcrumbsPlugin } from "./breadcrumbsPlugin";
import { createBreadcrumbsSettings } from "./settings/breadcrumbsSettings";

/**
 * Singleton instance of the BreadcrumbsPlugin orchestrator class.
 * This handles parsing state coordination, DOM element tracking, and event binding loops.
 */
const myBreadcrumbs = new BreadcrumbsPlugin();

/**
 * User interface configuration mapping context object generated via the settings factory.
 * Separating this prevents circular import errors by decoupling initialization properties.
 */
const breadcrumbsSettings = createBreadcrumbsSettings(myBreadcrumbs);

/**
 * Registers the plugin initialization entry-point lifecycle hook into the Acode ecosystem.
 * This execution path is fired when Acode successfully bootstraps installed plugins.
 *
 * @param PLUGIN_ID - The absolute unique identifier registration lookup token key.
 * @param initCallback - Asynchronous bootstrap method configuring context structures.
 * @param settingsSchema - Map layout schema passed down into Acode's settings dashboard.
 */
acode.setPluginInit(
  PLUGIN_ID,
  async (baseUrl: string, $page: any, cache: any) => {
    await myBreadcrumbs.init(baseUrl, $page, cache);
  },
  breadcrumbsSettings,
);

/**
 * Registers the cleanup and unmount lifecycle hook inside the Acode ecosystem.
 * Fired automatically when a user explicitly disables or uninstalls the plugin,
 * ensuring complete memory disposal, event teardowns, and absolute DOM removal.
 *
 * @param PLUGIN_ID - The absolute unique identifier registration lookup token key.
 * @param unmountCallback - Demolition procedure method managing internal cleanup routines.
 */
acode.setPluginUnmount(PLUGIN_ID, () => {
  myBreadcrumbs.destroy();
});
