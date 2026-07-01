import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Colors } from '../theme/colors'
import { DraftInboxScreen } from '../screens/DraftInboxScreen'
import { DraftReviewScreen } from '../screens/DraftReviewScreen'
import { SplitwiseConnectScreen } from '../screens/SplitwiseConnectScreen'
import { GroupSelectionScreen } from '../screens/GroupSelectionScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { ManualAlertTesterScreen } from '../screens/ManualAlertTesterScreen'

export type RootStackParamList = {
  DraftInbox: undefined
  DraftReview: { draftId: string; autoPost?: boolean }
  SplitwiseConnect: undefined
  GroupSelection: undefined
  Settings: undefined
  ManualAlertTester: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="DraftInbox"
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.paper,
        },
        headerTintColor: Colors.ink,
        headerShadowVisible: false,
        headerBackTitleVisible: false,
        contentStyle: {
          backgroundColor: Colors.paper,
        },
      }}
    >
      <Stack.Screen
        name="DraftInbox"
        component={DraftInboxScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DraftReview"
        component={DraftReviewScreen}
        options={{ title: 'Review Expense' }}
      />
      <Stack.Screen
        name="SplitwiseConnect"
        component={SplitwiseConnectScreen}
        options={{ title: 'Splitwise' }}
      />
      <Stack.Screen
        name="GroupSelection"
        component={GroupSelectionScreen}
        options={{ title: 'Select Group' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="ManualAlertTester"
        component={ManualAlertTesterScreen}
        options={{ title: 'Alert Tester' }}
      />
    </Stack.Navigator>
  )
}
