import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const useHaptics = () => {
    const triggerImpact = async (style: ImpactStyle = ImpactStyle.Light) => {
        try {
            await Haptics.impact({ style });
        } catch (e) {
            // Ignore if platform doesn't support
        }
    };

    const triggerNotification = async (type: NotificationType) => {
        try {
            await Haptics.notification({ type });
        } catch (e) {
            // Ignore
        }
    };

    return { triggerImpact, triggerNotification };
};
