import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import NewEntryScreen from '../screens/NewEntryScreen';
import ViewEntryScreen from '../screens/ViewEntryScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#fff',
            elevation: 2,
          },
          headerTitleStyle: {
            color: '#333',
            fontSize: 20,
          },
          headerTintColor: '#666',
        }}>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{headerShown: false}}
        />

        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="NewEntry"
          component={NewEntryScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ViewEntry"
          component={ViewEntryScreen}
          options={{
            title: 'Journal Entry',
            headerTitleAlign: 'center',
            headerStyle: {
              backgroundColor: '#988686', // Header background color
              borderBottomWidth: 1,
              borderBottomColor: '#5C4E4E',
            },
            headerTintColor: '#fff', // Back button and title text color
            headerTitleStyle: {
              color: '#fff'
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
