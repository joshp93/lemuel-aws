import { VoltraAndroid } from "@use-voltra/android";
import type {
  AndroidWidgetVariants,
  WidgetRenderRequest,
} from "@use-voltra/android-server";
import { fetchTodayProverb } from "./fetchTodayProverb";

/**
 * Renders the proverb widget for a server-driven update request.
 *
 * Fetches the daily proverb for the version specified in the
 * {@link https://www.use-voltra.dev/v1/android/development/server-driven-widgets | X-Bible-Version header}
 * and returns size variants for the Voltra Android widget renderer.
 */
export const renderProverbWidget = async (
  req: WidgetRenderRequest,
): Promise<AndroidWidgetVariants> => {
  const versionHeader = req.headers["x-bible-version"];
  const version = typeof versionHeader === "string" ? versionHeader : "niv";

  const proverb = await fetchTodayProverb(version);

  const content = (
    <VoltraAndroid.Box
      deepLinkUrl="lemuel://"
      style={{
        padding: 16,
        backgroundColor: "#FDFBF7",
        borderRadius: 16,
        width: "100%",
        height: "100%",
        justifyContent: "center",
      }}
    >
      <VoltraAndroid.Column
        verticalAlignment="center-vertically"
        horizontalAlignment="start"
      >
        <VoltraAndroid.Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: "#333333",
          }}
        >
          {proverb.ref}
        </VoltraAndroid.Text>
        <VoltraAndroid.Text
          style={{
            fontSize: 18,
            color: "#1a1a1a",
            marginTop: 12,
          }}
        >
          {proverb.proverb}
        </VoltraAndroid.Text>
        {proverb.citation ? (
          <VoltraAndroid.Text
            style={{
              fontSize: 10,
              color: "#666666",
              marginTop: 15,
              textAlign: "left",
            }}
          >
            {proverb.citation}
          </VoltraAndroid.Text>
        ) : null}
      </VoltraAndroid.Column>
    </VoltraAndroid.Box>
  );

  return [
    { size: { width: 250, height: 250 }, content },
    { size: { width: 300, height: 200 }, content },
    { size: { width: 200, height: 200 }, content },
  ];
};

export interface ProverbWidgetData {
  ref: string;
  proverb: string;
  citation?: string;
}
