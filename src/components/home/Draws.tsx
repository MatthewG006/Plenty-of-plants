'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/context/AuthContext';
import { useDraw, refillDraws, MAX_DRAWS } from '@/lib/draw-manager';
import { getUserGameData } from '@/lib/firestore';

export default function Draws() {
    const { user } = useAuth();
    const [draws, setDraws] = useState(0);
    const [timeToNextDraw, setTimeToNextDraw] = useState(0);

    useEffect(() => {
        if (!user) return;

        const fetchInitialData = async () => {
            await refillDraws(user.uid);
            const gameData = await getUserGameData(user.uid);
            if (!gameData) return;

            setDraws(gameData.draws || 0);
            // This assumes you have a way to calculate the initial time to next draw
            // For simplicity, we are not calculating it here
        };

        fetchInitialData();
    }, [user]);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeToNextDraw(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const handleDraw = async () => {
        if (!user || draws <= 0) return;

        try {
            await useDraw(user.uid);
            setDraws(prev => prev - 1);
            // You might want to set the timer here based on your logic
        } catch (error) {
            console.error("Failed to use draw:", error);
        }
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    return (
        <Card>
            <CardContent className="p-6">
                <Button className="w-full" onClick={handleDraw} disabled={draws <= 0}>
                    Draw a Plant
                </Button>
                <div className="text-center mt-4">
                    <p className="font-semibold">{draws}/{MAX_DRAWS} Draws Available</p>
                    {draws < MAX_DRAWS && (
                        <p className="text-sm text-muted-foreground">Next draw in: {formatTime(timeToNextDraw)}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
