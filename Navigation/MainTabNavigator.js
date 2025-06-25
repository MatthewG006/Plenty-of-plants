// navigation/MainTabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import GachaScreen from '../screens/GachaScreen';
import UpgradeScreen from '../screens/UpgradeScreen';
import CommunityScreen from '../screens/CommunityScreen';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator initialRouteName="Home">
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Gacha"
        component={GachaScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ios-jet" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Upgrade"
        component={UpgradeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="arrow-up-circle" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
