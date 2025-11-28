
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

const tips = [
    "Visit the shop to get daily rewards.",
    "Complete daily challenges to earn extra leaves.",
    "Use your leaves to draw new plants.",
    "Evolve your plants to make them even more special.",
];

export default function GameTips() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="w-6 h-6 text-yellow-400" />
                    <span>Game Tips</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                    {tips.map((tip, index) => (
                        <li key={index} className="text-sm">{tip}</li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
