import "./ricos-ssr-shim";
import { RicosViewer, pluginImageViewer, pluginLinkViewer } from "@wix/ricos";
import "@wix/ricos/css/ricos-viewer.global.inject";
import "@wix/ricos/css/all-plugins-viewer.css";

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
      <RicosViewer
        content={content}
        plugins={[pluginImageViewer(), pluginLinkViewer()]}
        theme={{ colorPalette: { format: 'color', textColor: "#f5f5f7" } }} />
    </div>
  );
}
