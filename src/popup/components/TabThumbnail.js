import React, { Component } from "react";
import browser from "webextension-polyfill";

const thumbnailCache = new Map();
const DEFAULT_PLACEHOLDER = "/icons/favicon.png";

export default class TabThumbnail extends Component {
  constructor(props) {
    super(props);
    this.state = {
      src: null,
      isLoading: Boolean(props.thumbnailId)
    };
    this.objectUrl = null;
    this.isMountedFlag = false;
  }

  componentDidMount() {
    this.isMountedFlag = true;
    this.loadThumbnail();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.thumbnailId !== this.props.thumbnailId) {
      this.loadThumbnail();
    }
  }

  componentWillUnmount() {
    this.isMountedFlag = false;
    this.cleanupObjectUrl();
  }

  cleanupObjectUrl() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  async loadThumbnail() {
    const { thumbnailId } = this.props;
    this.cleanupObjectUrl();

    if (!thumbnailId) {
      if (this.isMountedFlag) this.setState({ src: null, isLoading: false });
      return;
    }

    this.setState({ isLoading: true });

    try {
      let cacheEntry = thumbnailCache.get(thumbnailId);
      if (!cacheEntry) {
        const response = await browser.runtime.sendMessage({
          message: "getThumbnail",
          id: thumbnailId
        });

        if (!response || !response.buffer) {
          thumbnailCache.delete(thumbnailId);
          if (this.isMountedFlag) this.setState({ src: null, isLoading: false });
          return;
        }

        const buffer = response.buffer instanceof ArrayBuffer
          ? response.buffer
          : new Uint8Array(response.buffer).buffer;

        cacheEntry = {
          buffer,
          mimeType: response.mimeType || "image/png"
        };
        thumbnailCache.set(thumbnailId, cacheEntry);
      }

      const blob = new Blob([cacheEntry.buffer], { type: cacheEntry.mimeType });
      const objectUrl = URL.createObjectURL(blob);
      this.objectUrl = objectUrl;
      if (this.isMountedFlag) this.setState({ src: objectUrl, isLoading: false });
    } catch (err) {
      if (this.isMountedFlag) this.setState({ src: null, isLoading: false });
    }
  }

  render() {
    const { src, isLoading } = this.state;
    const { fallback, alt } = this.props;
    const displaySrc = src || fallback || DEFAULT_PLACEHOLDER;

    return (
      <div className={`tabThumbnail ${isLoading ? "isLoading" : ""}`}>
        <img
          src={displaySrc}
          alt={alt || ""}
          onError={event => {
            if (event?.target?.src !== DEFAULT_PLACEHOLDER) {
              event.target.src = DEFAULT_PLACEHOLDER;
            }
          }}
        />
      </div>
    );
  }
}
