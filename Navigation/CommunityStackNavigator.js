// navigation/CommunityStackNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CommunityScreen from '../screens/CommunityScreen';

const Stack = createStackNavigator();

const CommunityStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CommunityMain"
        component={CommunityScreen}
        options={{ headerTitle: 'Community' }}
      />
      {/* Add more Community-related screens here if needed */}
    </Stack.Navigator>
  );
};

export default CommunityStackNavigator;
