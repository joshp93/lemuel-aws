import type { WidgetUpdateHandler } from "@use-voltra/android-server";
import { createAndroidWidgetUpdateHandler } from "@use-voltra/android-server";
import { renderProverbWidget } from "./proverbWidget";

let widgetHandler: WidgetUpdateHandler | null = null;

export const getWidgetHandler = (): WidgetUpdateHandler => {
  if (widgetHandler) return widgetHandler;

  widgetHandler = createAndroidWidgetUpdateHandler({
    render: renderProverbWidget,
  });

  return widgetHandler;
};
