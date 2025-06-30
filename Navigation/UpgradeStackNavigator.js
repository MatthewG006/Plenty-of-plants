// navigation/UpgradeStackNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import UpgradeScreen from '../screens/UpgradeScreen';

const Stack = createStackNavigator();

const UpgradeStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="UpgradeMain"
        component={UpgradeScreen}
        options={{ headerTitle: 'Upgrade' }}
      />
      {/* Add more Upgrade-related screens here if needed */}
    </Stack.Navigator>
  );
};

export default UpgradeStackNavigator;
