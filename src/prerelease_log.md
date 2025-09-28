# Prerelease Log

## Version 0.18

- **Feature:** Plant Beauty Contest
- **Description:** Implemented a real-time multiplayer Plant Beauty Contest. Players can join sessions, enter one of their plants, and vote for a winner. The winner receives a special "Red Glitter" cosmetic prize. This feature includes a new "Park" area as an entry point and uses Firestore for real-time session management.

## Version 0.17

- **Feature:** Bonus Challenges & Info Pop-ups
- **Description:** Added a new set of "Bonus Challenges" that appear after daily challenges are completed. Implemented one-time informational pop-ups on the home page to notify users about new game features, such as the bonus challenges and the relocation of plant watering to the Garden page.

## Version 0.16

- **Revert:** Reverted the "Garden" page feature. All watering and plant care functionality has been returned to the main "Room" page to simplify the user experience.

## Version 0.15

- **Feature:** Video Ad & IAP Foundation
- **Description:** Added the foundational UI and logic for displaying a placeholder video ad before a free plant draw. Added a "Premium Shop" section with a placeholder for real-money purchases.

## Version 0.14

- **Feature:** Continuous Background Music
- **Description:** Moved the `AudioProvider` and `MusicPlayer` to the root layout (`src/app/layout.tsx`) to ensure background music plays uninterrupted across all pages of the application. This provides a more seamless and immersive user experience.

    