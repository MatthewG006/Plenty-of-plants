import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import PlantDetailScreen from './screens/PlantDetailScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Your Virtual Room" }} />
        <Stack.Screen name="PlantDetail" component={PlantDetailScreen} options={{ title: "Plant Details" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
