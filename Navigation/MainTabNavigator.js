// navigation/MainTabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeStackNavigator from './HomeStackNavigator';
import GachaStackNavigator from './GachaStackNavigator';
import UpgradeStackNavigator from './UpgradeStackNavigator';
import CommunityStackNavigator from './CommunityStackNavigator';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Gacha') iconName = 'airplane'; // changed from ios-jet
          else if (route.name === 'Upgrade') iconName = 'arrow-up-circle';
          else if (route.name === 'Community') iconName = 'people';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Gacha" component={GachaStackNavigator} />
      <Tab.Screen name="Upgrade" component={UpgradeStackNavigator} />
      <Tab.Screen name="Community" component={CommunityStackNavigator} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
