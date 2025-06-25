// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GameProvider } from './context/GameContext';

import LoginScreen from './screens/LoginScreen';
import MainTabNavigator from './navigation/MainTabNavigator';
import PlantDetailScreen from './screens/PlantDetailScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <GameProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PlantDetail"
            component={PlantDetailScreen}
            options={{ title: 'Plant Details' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GameProvider>
  );
}
