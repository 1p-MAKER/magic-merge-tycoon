import { useState, useEffect } from 'react';

export const useNightMode = () => {
    const [isNight, setIsNight] = useState(false);

    useEffect(() => {
        const checkTime = () => {
            const hour = new Date().getHours();
            // Night is 18:00 (6 PM) to 06:00 (6 AM)
            const night = hour >= 18 || hour < 6;
            setIsNight(night);
        };

        checkTime();
        const interval = setInterval(checkTime, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    return isNight;
};
