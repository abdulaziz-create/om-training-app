import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import CenterScreen from './src/screens/CenterScreen';
import CourseScreen from './src/screens/CourseScreen';
import BookingScreen from './src/screens/BookingScreen';

const Stack = createNativeStackNavigator();

export default function App(){
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{title:'الورش التدريبية'}} />
        <Stack.Screen name="Center" component={CenterScreen} options={{title:'مركز تدريبي'}} />
        <Stack.Screen name="Course" component={CourseScreen} options={{title:'الدورة'}} />
        <Stack.Screen name="Booking" component={BookingScreen} options={{title:'حجز'}} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
