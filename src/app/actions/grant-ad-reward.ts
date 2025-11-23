
'use server';

import { auth, db } from "@/lib/firebase";
import { claimFreeDraw } from "@/lib/draw-manager";

/**
 * A secure server action to grant a rewarded ad reward.
 * This is called by the client AFTER the AdMob SDK confirms the user has successfully watched an ad.
 * @param userId The UID of the user to reward.
 * @returns An object indicating success or failure.
 */
export async function grantAdReward(userId: string): Promise<{ success: boolean; message: string; }> {
    if (!userId) {
        return { success: false, message: "User is not authenticated." };
    }

    try {
        // The daily check is removed. We grant a draw as long as they are not at max capacity.
        const result = await claimFreeDraw(userId);

        if (result.success) {
            return { success: true, message: "Free draw granted successfully." };
        } else {
            // Forward the reason from the draw manager (e.g., 'max_draws').
            return { success: false, message: result.reason || "Failed to grant reward." };
        }

    } catch (error: any) {
        console.error("Error in grantAdReward server action:", error);
        return { success: false, message: "An unexpected server error occurred." };
    }
}

    