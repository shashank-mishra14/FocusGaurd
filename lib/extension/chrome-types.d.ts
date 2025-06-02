// Chrome Extension API Type Definitions
declare global {
  namespace chrome {
    namespace storage {
      interface LocalStorageArea {
        get(
          keys: string | string[] | Record<string, any> | null,
          callback: (items: Record<string, any>) => void
        ): void;
        set(items: Record<string, any>, callback?: () => void): void;
        clear(callback?: () => void): void;
      }
      const local: LocalStorageArea;
    }

    namespace runtime {
      interface MessageSender {
        tab?: chrome.tabs.Tab;
        frameId?: number;
        id?: string;
        url?: string;
        tlsChannelId?: string;
      }

      function sendMessage(
        message: any,
        responseCallback?: (response: any) => void
      ): void;

      interface MessageEvent {
        addListener(
          callback: (
            message: any,
            sender: MessageSender,
            sendResponse: (response?: any) => void
          ) => boolean | void
        ): void;
      }

      const onMessage: MessageEvent;
    }

    namespace tabs {
      interface Tab {
        id?: number;
        index: number;
        windowId: number;
        openerTabId?: number;
        selected: boolean;
        highlighted: boolean;
        active: boolean;
        pinned: boolean;
        audible?: boolean;
        discarded: boolean;
        autoDiscardable: boolean;
        mutedInfo?: any;
        url?: string;
        title?: string;
        favIconUrl?: string;
        status?: string;
        incognito: boolean;
        width?: number;
        height?: number;
        sessionId?: string;
      }

      function get(tabId: number, callback: (tab: Tab) => void): void;
      function query(
        queryInfo: any,
        callback: (result: Tab[]) => void
      ): void;
      function update(
        tabId: number,
        updateProperties: any,
        callback?: (tab: Tab) => void
      ): void;
      function create(createProperties: any, callback?: (tab: Tab) => void): void;

      interface TabActivatedInfo {
        tabId: number;
        windowId: number;
      }

      interface TabChangeInfo {
        status?: string;
        url?: string;
        pinned?: boolean;
        audible?: boolean;
        discarded?: boolean;
        autoDiscardable?: boolean;
        mutedInfo?: any;
        favIconUrl?: string;
        title?: string;
      }

      interface TabActivatedEvent {
        addListener(callback: (activeInfo: TabActivatedInfo) => void): void;
      }

      interface TabUpdatedEvent {
        addListener(
          callback: (tabId: number, changeInfo: TabChangeInfo, tab: Tab) => void
        ): void;
      }

      interface TabRemovedEvent {
        addListener(
          callback: (tabId: number, removeInfo: any) => void
        ): void;
      }

      const onActivated: TabActivatedEvent;
      const onUpdated: TabUpdatedEvent;
      const onRemoved: TabRemovedEvent;
    }

    namespace scripting {
      function executeScript(
        injection: {
          target: { tabId: number };
          func: Function;
          args?: any[];
        },
        callback?: (result: any[]) => void
      ): void;
    }
  }
}

export {}; 