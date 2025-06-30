// navigation/GachaStackNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import GachaScreen from '../screens/GachaScreen';

const Stack = createStackNavigator();

const GachaStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="GachaMain"
        component={GachaScreen}
        options={{ headerTitle: 'Gacha' }}
      />
      {/* Add more Gacha-related screens here if needed */}
    </Stack.Navigator>
  );
};

export default GachaStackNavigator;
