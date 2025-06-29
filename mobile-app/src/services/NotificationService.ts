import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';

export class NotificationService {
  static configure() {
    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
      },
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
      },
      onAction: function (notification) {
        console.log('ACTION:', notification.action);
        console.log('NOTIFICATION:', notification);
      },
      onRegistrationError: function (err) {
        console.error(err.message, err);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    PushNotification.createChannel(
      {
        channelId: 'greenpathorg-channel',
        channelName: 'GreenPathOrg Notifications',
        channelDescription: 'Notifications for waste collection and management',
        playSound: true,
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Channel created: ${created}`)
    );
  }

  static showLocalNotification(title: string, message: string, data?: any) {
    PushNotification.localNotification({
      channelId: 'greenpathorg-channel',
      title,
      message,
      playSound: true,
      soundName: 'default',
      userInfo: data,
    });
  }

  static scheduleNotification(
    title: string,
    message: string,
    date: Date,
    data?: any
  ) {
    PushNotification.localNotificationSchedule({
      channelId: 'greenpathorg-channel',
      title,
      message,
      date,
      playSound: true,
      soundName: 'default',
      userInfo: data,
    });
  }

  static cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  static getBadgeCount(callback: (count: number) => void) {
    PushNotification.getApplicationIconBadgeNumber(callback);
  }

  static setBadgeCount(count: number) {
    PushNotification.setApplicationIconBadgeNumber(count);
  }
}