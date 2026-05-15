import {
  RicosViewer,
  pluginImageViewer,
  pluginGalleryViewer,
  pluginVideoViewer,
  pluginAudioViewer,
  pluginDividerViewer,
  pluginLinkViewer,
  pluginLinkPreviewViewer,
  pluginHtmlViewer,
  pluginActionButtonViewer,
  pluginLinkButtonViewer,
  pluginTableViewer,
  pluginCollapsibleListViewer,
  pluginFileUploadViewer,
  pluginGiphyViewer,
  pluginPollViewer,
  pluginVerticalEmbedViewer,
  pluginTocViewer,
  pluginShapeViewer,
  pluginCodeBlockViewer,
  pluginMentionsViewer,
  pluginHashtagViewer,
  pluginEmojiViewer,
  pluginIndentViewer,
  pluginLineSpacingViewer,
  pluginTextColorViewer,
  pluginTextHighlightViewer,
  pluginFontFamilyViewer,
  pluginSpoilerViewer,
} from "@wix/ricos";
import "@wix/ricos/css/ricos-viewer.global.inject";
import "@wix/ricos/css/all-plugins-viewer.css";

const plugins = [
  pluginImageViewer(),
  pluginGalleryViewer(),
  pluginVideoViewer(),
  pluginAudioViewer(),
  pluginDividerViewer(),
  pluginLinkViewer(),
  pluginLinkPreviewViewer(),
  pluginHtmlViewer(),
  pluginActionButtonViewer(),
  pluginLinkButtonViewer(),
  pluginTableViewer(),
  pluginCollapsibleListViewer(),
  pluginFileUploadViewer(),
  pluginGiphyViewer(),
  pluginPollViewer(),
  pluginVerticalEmbedViewer(),
  pluginTocViewer(),
  pluginShapeViewer(),
  pluginCodeBlockViewer(),
  pluginMentionsViewer(),
  pluginHashtagViewer(),
  pluginEmojiViewer(),
  pluginIndentViewer(),
  pluginLineSpacingViewer(),
  pluginTextColorViewer(),
  pluginTextHighlightViewer(),
  pluginFontFamilyViewer(),
  pluginSpoilerViewer(),
];

const theme = {
  colorPalette: {
    format: "color" as const,
    bgColor: "#0e0e12",
    textColor: "#f5f5f7",
    accent1: "#faff00",
    accent2: "#faff00",
    accent3: "#8a8a93",
    accent4: "#5a5a62",
    shade1: "#1f1f23",
    shade2: "#8a8a93",
    shade3: "#f5f5f7",
  },
};

type Props = {
  content: any;
  fallback?: string;
};

export default function PostBody({ content, fallback }: Props) {
  if (!content || (Array.isArray(content?.nodes) && content.nodes.length === 0)) {
    return (
      <div className="post-body post-body--fallback">
        <p>{fallback || "This post has no body content yet."}</p>
      </div>
    );
  }

  return (
    <div className="post-body">
      <RicosViewer content={content} plugins={plugins} theme={theme} />
    </div>
  );
}
