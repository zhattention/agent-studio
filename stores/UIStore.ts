import { makeAutoObservable } from 'mobx';
import { RootStore } from './RootStore';
import { Notification } from '../types';

export class UIStore {
  rootStore: RootStore;
  notification: Notification | null = null;
  
  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
    makeAutoObservable(this, {
      rootStore: false
    });
  }
  
  /**
   * 显示通知
   * @param type 通知类型：'success'、'error'、'info'、'warning'
   * @param message 通知消息
   * @param duration 显示时长（毫秒），默认3000ms
   */
  showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string, duration = 3000) => {
    this.notification = { type, message };
    
    // 设置自动消失的计时器
    setTimeout(() => {
      this.clearNotification();
    }, duration);
  };
  
  /**
   * 清除当前通知
   */
  clearNotification = () => {
    this.notification = null;
  };
} 