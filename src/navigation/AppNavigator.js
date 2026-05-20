import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';

import LandingScreen from '../screens/auth/LandingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import LegalScreen from '../screens/auth/LegalScreen';

import DashboardScreen from '../screens/main/DashboardScreen';
import TransactionsScreen from '../screens/main/TransactionsScreen';
import AnalyticsScreen from '../screens/main/AnalyticsScreen';
import BudgetsScreen from '../screens/main/BudgetsScreen';
import GoalsScreen from '../screens/main/GoalsScreen';
import SubscriptionsScreen from '../screens/main/SubscriptionsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import RecurringScreen from '../screens/main/RecurringScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Overview:      { active: 'grid',           inactive: 'grid-outline' },
  Transactions:  { active: 'list',            inactive: 'list-outline' },
  Analytics:     { active: 'bar-chart',       inactive: 'bar-chart-outline' },
  Budgets:       { active: 'pie-chart',       inactive: 'pie-chart-outline' },
  Goals:         { active: 'trophy',          inactive: 'trophy-outline' },
  Subscriptions: { active: 'refresh',         inactive: 'refresh-outline' },
  Profile:       { active: 'person-circle',   inactive: 'person-circle-outline' },
};

function MainTabs() {
  const { colors } = useTheme();
  const { t } = useLang();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.text3,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.active : icons.inactive;
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Overview"      component={DashboardScreen}     options={{ tabBarLabel: t('navOverview') }} />
      <Tab.Screen name="Transactions"  component={TransactionsScreen}  options={{ tabBarLabel: t('navTransactions') }} />
      <Tab.Screen name="Analytics"     component={AnalyticsScreen}     options={{ tabBarLabel: t('navAnalytics') }} />
      <Tab.Screen name="Budgets"       component={BudgetsScreen}       options={{ tabBarLabel: t('navBudgets') }} />
      <Tab.Screen name="Goals"         component={GoalsScreen}         options={{ tabBarLabel: t('navGoals') }} />
      <Tab.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ tabBarLabel: t('navSubscriptions') }} />
      <Tab.Screen name="Profile"       component={ProfileScreen}       options={{ tabBarLabel: t('navProfile') }} />
    </Tab.Navigator>
  );
}

function MainStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Recurring" component={RecurringScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { currentUser, pendingBioUser, authChecked } = useAuth();

  if (!authChecked) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={currentUser ? 'Main' : pendingBioUser ? 'Login' : 'Landing'}
      >
        {!currentUser ? (
          <>
            <Stack.Screen name="Landing"        component={LandingScreen} />
            <Stack.Screen name="Login"          component={LoginScreen} />
            <Stack.Screen name="Register"       component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="Legal"          component={LegalScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={MainStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
