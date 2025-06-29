import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '@/hooks/useAuth';
import { RootStackParamList } from '@/types';

// Screens
import LoginScreen from '@/screens/LoginScreen';
import AdminDashboard from '@/screens/AdminDashboard';
import ModeratorDashboard from '@/screens/ModeratorDashboard';
import ManagerDashboard from '@/screens/ManagerDashboard';
import CollectorDashboard from '@/screens/CollectorDashboard';
import GeneratorDashboard from '@/screens/GeneratorDashboard';
import QRScannerScreen from '@/screens/QRScannerScreen';
import CollectionFormScreen from '@/screens/CollectionFormScreen';
import IssueFormScreen from '@/screens/IssueFormScreen';
import IssueDetailScreen from '@/screens/IssueDetailScreen';
import CollectionDetailScreen from '@/screens/CollectionDetailScreen';
import ProfileScreen from '@/screens/ProfileScreen';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Show loading screen if needed
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#22C55E',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {!user ? (
        <Stack.Screen
          name="Auth"
          component={LoginScreen}
          options={{
            headerShown: false,
          }}
        />
      ) : (
        <>
          {/* Role-based dashboard routing */}
          {user.role === 'admin' && (
            <Stack.Screen
              name="AdminDashboard"
              component={AdminDashboard}
              options={{
                title: 'Admin Dashboard',
                headerLeft: () => null,
              }}
            />
          )}
          {user.role === 'moderator' && (
            <Stack.Screen
              name="ModeratorDashboard"
              component={ModeratorDashboard}
              options={{
                title: 'Moderator Dashboard',
                headerLeft: () => null,
              }}
            />
          )}
          {user.role === 'manager' && (
            <Stack.Screen
              name="ManagerDashboard"
              component={ManagerDashboard}
              options={{
                title: 'Manager Dashboard',
                headerLeft: () => null,
              }}
            />
          )}
          {user.role === 'collector' && (
            <Stack.Screen
              name="CollectorDashboard"
              component={CollectorDashboard}
              options={{
                title: 'Collector App',
                headerLeft: () => null,
              }}
            />
          )}
          {user.role === 'generator' && (
            <Stack.Screen
              name="GeneratorDashboard"
              component={GeneratorDashboard}
              options={{
                title: 'My Household',
                headerLeft: () => null,
              }}
            />
          )}

          {/* Common screens */}
          <Stack.Screen
            name="QRScanner"
            component={QRScannerScreen}
            options={{
              title: 'Scan QR Code',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="CollectionForm"
            component={CollectionFormScreen}
            options={{
              title: 'Collection Form',
            }}
          />
          <Stack.Screen
            name="IssueForm"
            component={IssueFormScreen}
            options={{
              title: 'Report Issue',
            }}
          />
          <Stack.Screen
            name="IssueDetail"
            component={IssueDetailScreen}
            options={{
              title: 'Issue Details',
            }}
          />
          <Stack.Screen
            name="CollectionDetail"
            component={CollectionDetailScreen}
            options={{
              title: 'Collection Details',
            }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: 'Profile',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};