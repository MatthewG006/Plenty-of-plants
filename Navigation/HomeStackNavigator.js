// navigation/HomeStackNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import PlantDetailScreen from '../screens/PlantDetailScreen';

const Stack = createStackNavigator();

const HomeStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerTitle: 'Home' }}
      />
      <Stack.Screen
        name="PlantDetail"
        component={PlantDetailScreen}
        options={{ title: 'Plant Details' }}
      />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
