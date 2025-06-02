import type { 
  TimeTrackingData, 
  AnalyticsData, 
  StorageData,
  ChromeMessage,
  ChromeMessageResponse 
} from './types';
import './chrome-types';

// Note: Chrome extension APIs will be available at runtime in the extension context
// The chrome global is provided by the browser extension environment

export class StorageManager {
  static async get<K extends keyof StorageData>(
    keys: K | K[]
  ): Promise<Pick<StorageData, K>> {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys as string | string[], (result: Record<string, unknown>) => {
        resolve(result as Pick<StorageData, K>);
      });
    });
  }

  static async set<K extends keyof StorageData>(
    data: Pick<StorageData, K>
  ): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }

  static async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.clear(resolve);
    });
  }
}

export class SecurityManager {
  static async hashPassword(password: string): Promise<string> {
    // Using Web Crypto API for secure hashing instead of crypto-js
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static async verifyPassword(inputPassword: string, hashedPassword: string): Promise<boolean> {
    const hashedInput = await this.hashPassword(inputPassword);
    return hashedInput === hashedPassword;
  }

  static isSessionValid(lastAccess: number, sessionDuration: number = 30 * 60 * 1000): boolean {
    return Date.now() - lastAccess <= sessionDuration;
  }
}

export class TimeManager {
  static formatTime(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  static getTodayString(): string {
    return new Date().toDateString();
  }

  static getDatesRange(days: number): string[] {
    const dates: string[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date.toDateString());
    }

    return dates;
  }

  static calculateAnalytics(timeTrackingData: TimeTrackingData, period: number): AnalyticsData {
    const analytics: AnalyticsData = {};
    const dates = this.getDatesRange(period);

    Object.entries(timeTrackingData).forEach(([domain, domainData]) => {
      analytics[domain] = {
        totalTime: 0,
        dailyData: {},
        averageDaily: 0
      };

      let validDays = 0;

      dates.forEach(date => {
        const dayTime = domainData[date] || 0;
        analytics[domain].dailyData[date] = dayTime;
        analytics[domain].totalTime += dayTime;

        if (dayTime > 0) validDays++;
      });

      analytics[domain].averageDaily = validDays > 0 ? 
        analytics[domain].totalTime / validDays : 0;
    });

    return analytics;
  }
}

export class DomainManager {
  static extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      console.error('Invalid URL:', url);
      return '';
    }
  }

  static isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }

  static matchesDomain(url: string, protectedDomain: string): boolean {
    const currentDomain = this.extractDomain(url);
    return currentDomain.includes(protectedDomain) || protectedDomain.includes(currentDomain);
  }
}

export class MessageManager {
  static sendMessage<T = Record<string, unknown>>(message: ChromeMessage): Promise<ChromeMessageResponse & { data?: T }> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response: ChromeMessageResponse & { data?: T }) => {
        resolve(response || { success: false, error: 'No response' });
      });
    });
  }

  static onMessage(
    callback: (
      message: ChromeMessage,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: ChromeMessageResponse) => void
    ) => void | boolean
  ): void {
    chrome.runtime.onMessage.addListener(callback);
  }
} 