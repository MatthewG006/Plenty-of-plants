
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { markPopupAsSeen } from '@/lib/firestore';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Bell, Sparkles } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';

interface Popup {
  id: string;
  title: string;
  description: React.ReactNode;
  icon: React.ElementType;
}

const ALL_POPUPS: Popup[] = [
  {
    id: 'bonusChallenges',
    title: 'New: Bonus Challenges!',
    description: "Once you complete all your daily challenges, a new set of bonus challenges will appear. Check them out for extra rewards!",
    icon: Sparkles,
  },
];

const NOTIFICATION_POPUP: Popup = {
  id: 'enableNotifications',
  title: 'Enable Notifications!',
  description: "Want reminders to water your plants and claim rewards? Go to the Settings page and toggle on Reminders.",
  icon: Bell,
};

export default function PopupManager() {
  const { user, gameData } = useAuth();
  const { playSfx } = useAudio();
  const [currentPopup, setCurrentPopup] = useState<Popup | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true); // Default to true to prevent flash

  useEffect(() => {
    if (user && gameData) {
      if ('Notification' in window) {
        if (Notification.permission !== 'granted') {
          setNotificationsEnabled(false);
          setCurrentPopup(NOTIFICATION_POPUP);
          return; // Prioritize notification pop-up
        }
      }
      
      const seenPopups = gameData.seenPopups || [];
      const unseenPopup = ALL_POPUPS.find(p => !seenPopups.includes(p.id));
      if (unseenPopup) {
        setCurrentPopup(unseenPopup);
      }
    }
  }, [user, gameData]);

  const handleClose = () => {
    if (user && currentPopup) {
      playSfx('tap');
      if(currentPopup.id !== 'enableNotifications') {
        markPopupAsSeen(user.uid, currentPopup.id);
      }
      setCurrentPopup(null);
    }
  };

  if (!currentPopup) {
    return null;
  }

  const Icon = currentPopup.icon;

  return (
    <AlertDialog open={!!currentPopup} onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-8 h-8 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-center">{currentPopup.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {currentPopup.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleClose} className="w-full">
            Got it!
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
