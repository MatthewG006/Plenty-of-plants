
'use client';

import * as React from "react"
import Autoplay from "embla-carousel-autoplay"
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Leaf, Droplet, Users, Sparkles as SparklesIcon } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

const tips = [
    {
        icon: Leaf,
        title: "Draw New Plants",
        text: "Use your daily draws from the Home screen or Shop to discover new, unique AI-generated plants.",
    },
    {
        icon: Droplet,
        title: "Water for XP",
        text: "Go to your Garden to water your plants. They gain XP, level up, and might even drop a seed!",
    },
    {
        icon: SparklesIcon,
        title: "Evolve Your Plants",
        text: "Once a plant reaches level 10, it's ready to evolve into a new, more magnificent form.",
    },
    {
        icon: Users,
        title: "Visit the Community",
        text: "Check out other players' collections in the Community Showcase and give them a 'like' to award them gold.",
    },
];

export default function GameTips() {
    const plugin = React.useRef(
        Autoplay({ delay: 5000, stopOnInteraction: true })
    )

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-0">
                 <Carousel
                    plugins={[plugin.current]}
                    className="w-full"
                    onMouseEnter={plugin.current.stop}
                    onMouseLeave={plugin.current.reset}
                >
                    <CarouselContent>
                        {tips.map((tip, index) => (
                            <CarouselItem key={index}>
                                <div className="p-6 flex flex-col items-center text-center">
                                    <div className="flex items-center justify-center bg-yellow-100/80 rounded-full w-16 h-16 mb-4 border-2 border-yellow-300/50">
                                         <tip.icon className="w-8 h-8 text-yellow-500" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-primary">{tip.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{tip.text}</p>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>
            </CardContent>
        </Card>
    );
}