import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Platform,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminSidebar from '@/components/AdminSidebar';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const chartWidth = isTablet ? width * 0.42 : width * 0.85;

// Function to render a LEGO stud
interface LegoStudProps {
  style?: any;
}

const LegoStud = ({ style }: LegoStudProps) => (
  <View style={[styles.legoStud, style]}>
    <View style={styles.legoStudInner} />
  </View>
);

// Dashboard card component
interface DashboardCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  subtext: string;
  trendValue: string;
  trendUp: boolean;
}

const DashboardCard = ({ title, value, icon, color, subtext, trendValue, trendUp }: DashboardCardProps) => (
  <View style={styles.dashboardCard}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={[styles.iconContainer, {backgroundColor: color}]}>
        <MaterialCommunityIcons name={icon as any} size={18} color="#FFFFFF" />
        {/* LEGO studs on icon */}
        <LegoStud style={{top: -4, left: 4}} />
        <LegoStud style={{top: -4, right: 4}} />
      </View>
    </View>
    
    <Text style={styles.cardValue}>{value}</Text>
    
    <View style={styles.cardFooter}>
      <Text style={styles.cardSubtext}>{subtext}</Text>
      <View style={styles.trendContainer}>
        <MaterialCommunityIcons 
          name={trendUp ? "arrow-up" : "arrow-down"} 
          size={16} 
          color={trendUp ? "#3EC65E" : "#E3000B"} 
        />
        <Text style={[
          styles.trendValue, 
          {color: trendUp ? "#3EC65E" : "#E3000B"}
        ]}>
          {trendValue}
        </Text>
      </View>
    </View>
  </View>
);

// Activity item component
interface ActivityItemProps {
  title: string;
  time: string;
  icon: string;
  color: string;
}

const ActivityItem = ({ title, time, icon, color }: ActivityItemProps) => (
  <View style={styles.activityItem}>
    <View style={[styles.activityIconContainer, {backgroundColor: color}]}>
      <MaterialCommunityIcons name={icon as any} size={16} color="#FFFFFF" />
      {/* LEGO stud on activity icon */}
      <LegoStud style={{top: -4, left: 8}} />
    </View>
    <View style={styles.activityContent}>
      <Text style={styles.activityTitle}>{title}</Text>
      <Text style={styles.activityTime}>{time}</Text>
    </View>
  </View>
);

// Quick action button
interface QuickActionButtonProps {
  title: string;
  icon: string;
  color: string;
}

const QuickActionButton = ({ title, icon, color }: QuickActionButtonProps) => (
  <TouchableOpacity style={styles.quickActionButton}>
    <View style={[styles.quickActionIconContainer, {backgroundColor: color}]}>
      <MaterialCommunityIcons name={icon as any} size={20} color="#FFFFFF" />
      {/* LEGO studs on quick action icon */}
      <View style={styles.brickStudsRow}>
        <LegoStud style={{marginRight: 2}} />
        <LegoStud style={{marginLeft: 2}} />
      </View>
    </View>
    <Text style={styles.quickActionText}>{title}</Text>
  </TouchableOpacity>
);

export default function AdminDashboard() {
  // Sample dashboard data
  const dashboardData = {
    totalSales: {
      value: "$12,846",
      change: "+12.5%",
      isUp: true,
      timeframe: "vs last month"
    },
    totalOrders: {
      value: "156",
      change: "+8.2%",
      isUp: true,
      timeframe: "vs last month"
    },
    activeUsers: {
      value: "1,285",
      change: "+24.6%",
      isUp: true,
      timeframe: "vs last month"
    },
    returns: {
      value: "12",
      change: "-3.8%",
      isUp: false,
      timeframe: "vs last month"
    }
  };

  // Sample activities
  const recentActivities = [
    { title: "New order #1242 received", time: "5 minutes ago", icon: "package-variant-closed", color: "#FF8C01" },
    { title: "User John Smith registered", time: "1 hour ago", icon: "account-plus", color: "#3EC65E" },
    { title: "Product 'Star Wars X-Wing' updated", time: "3 hours ago", icon: "toy-brick-plus", color: "#006DB7" },
    { title: "Payment for order #1238 processed", time: "Yesterday", icon: "credit-card-outline", color: "#F54545" },
    { title: "Inventory stock updated", time: "2 days ago", icon: "package-variant", color: "#A0A0A0" }
  ];

  // Chart data
  const salesData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        data: [12000, 15000, 13500, 14800, 16200, 18500],
        color: (opacity = 1) => `rgba(227, 0, 11, ${opacity})`, // LEGO Red
        strokeWidth: 2
      }
    ],
    legend: ["Monthly Sales ($)"]
  };

  const categoryData = {
    labels: ["Star Wars", "City", "Technic", "Friends", "Marvel"],
    datasets: [
      {
        data: [35, 25, 15, 15, 10],
        color: (opacity = 1) => `rgba(0, 109, 183, ${opacity})`, // LEGO Blue
      }
    ]
  };

  const userActivityData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: [220, 180, 240, 190, 280, 350, 310],
        color: (opacity = 1) => `rgba(62, 198, 94, ${opacity})`, // LEGO Green
        strokeWidth: 2
      }
    ],
    legend: ["Daily Active Users"]
  };

  // Chart configuration
  const chartConfig = {
    backgroundGradientFrom: "#333436",
    backgroundGradientTo: "#333436",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#ffa726"
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {!isTablet && <AdminSidebar />}
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <View style={styles.dateContainer}>
            <MaterialCommunityIcons name="calendar" size={18} color="#FFFFFF" />
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </Text>
          </View>
        </View>

        {/* Dashboard Summary Cards */}
        <View style={styles.cardsContainer}>
          <DashboardCard 
            title="Total Sales" 
            value={dashboardData.totalSales.value} 
            icon="cash-multiple" 
            color="#F54545"
            subtext={dashboardData.totalSales.timeframe}
            trendValue={dashboardData.totalSales.change}
            trendUp={dashboardData.totalSales.isUp}
          />
          <DashboardCard 
            title="Total Orders" 
            value={dashboardData.totalOrders.value} 
            icon="shopping" 
            color="#006DB7"
            subtext={dashboardData.totalOrders.timeframe}
            trendValue={dashboardData.totalOrders.change}
            trendUp={dashboardData.totalOrders.isUp}
          />
          <DashboardCard 
            title="Active Users" 
            value={dashboardData.activeUsers.value} 
            icon="account-group" 
            color="#3EC65E"
            subtext={dashboardData.activeUsers.timeframe}
            trendValue={dashboardData.activeUsers.change}
            trendUp={dashboardData.activeUsers.isUp}
          />
          <DashboardCard 
            title="Returns" 
            value={dashboardData.returns.value} 
            icon="package-variant-closed-remove" 
            color="#FF8C01"
            subtext={dashboardData.returns.timeframe}
            trendValue={dashboardData.returns.change}
            trendUp={dashboardData.returns.isUp}
          />
        </View>

        {/* Analytics Charts */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Sales Analytics</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Monthly Sales Performance</Text>
              <LineChart
                data={salesData}
                width={chartWidth}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
              {/* LEGO decoration */}
              <View style={styles.chartLegoDecoration}>
                <LegoStud style={{left: 10}} />
                <LegoStud style={{left: 30}} />
                <LegoStud style={{left: 50}} />
              </View>
            </View>
          </View>

          <View style={styles.doubleChartContainer}>
            <View style={[styles.chartCard, styles.halfChart]}>
              <Text style={styles.chartTitle}>Product Categories</Text>
              <PieChart
                data={categoryData.datasets[0].data.map((value, index) => ({
                  name: categoryData.labels[index],
                  population: value,
                  color: [
                    '#E3000B', '#006DB7', '#FFE500', 
                    '#3EC65E', '#FF8C01', '#A83E9A'
                  ][index % 6],
                  legendFontColor: '#FFFFFF',
                  legendFontSize: 12,
                }))}
                width={isTablet ? chartWidth * 0.48 : chartWidth}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>

            <View style={[styles.chartCard, styles.halfChart]}>
              <Text style={styles.chartTitle}>User Activity</Text>
              <BarChart
                data={userActivityData}
                width={isTablet ? chartWidth * 0.48 : chartWidth}
                height={200}
                chartConfig={{
                  ...chartConfig,
                  barPercentage: 0.7,
                }}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix=""
              />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            <QuickActionButton 
              title="Add Product" 
              icon="toy-brick-plus" 
              color="#F54545"
            />
            <QuickActionButton 
              title="View Products" 
              icon="view-grid-outline" 
              color="#006DB7"
            />
            <QuickActionButton 
              title="View Users" 
              icon="account-group" 
              color="#3EC65E"
            />
            <QuickActionButton 
              title="View Orders" 
              icon="clipboard-list" 
              color="#FF8C01"
            />
          </View>
        </View>
        
        {/* Recent Activities */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          <View style={styles.activitiesContainer}>
            <View style={styles.studRowContainer}>
              {[...Array(6)].map((_, index) => (
                <LegoStud key={index} style={{marginHorizontal: 8}} />
              ))}
            </View>
            {recentActivities.map((activity, index) => (
              <ActivityItem 
                key={index}
                title={activity.title}
                time={activity.time}
                icon={activity.icon}
                color={activity.color}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252628',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333436',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dateText: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dashboardCard: {
    width: isTablet ? '23%' : '48%',
    backgroundColor: '#333436',
    borderRadius: 8,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#444546',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    color: '#FFFFFFCC',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  iconContainer: {
    width: 30,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSubtext: {
    color: '#FFFFFFAA',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendValue: {
    marginLeft: 2,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: isTablet ? '23%' : '48%',
    backgroundColor: '#333436',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444546',
  },
  quickActionIconContainer: {
    width: 40,
    height: 30,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  brickStudsRow: {
    position: 'absolute',
    top: -6,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  activitiesContainer: {
    backgroundColor: '#333436',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#444546',
    position: 'relative',
    overflow: 'hidden',
  },
  studRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444546',
    paddingBottom: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#444546',
  },
  activityIconContainer: {
    width: 32,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Medium' : 'sans-serif-medium',
  },
  activityTime: {
    color: '#FFFFFFAA',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  chartContainer: {
    marginBottom: 24,
  },
  chartCard: {
    backgroundColor: '#333436',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Futura-Bold' : 'sans-serif-condensed',
  },
  chart: {
    marginVertical: -16,
    borderRadius: 16,
  },
  chartLegoDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doubleChartContainer: {
    flexDirection: isTablet ? 'row' : 'column',
    justifyContent: 'space-between',
  },
  halfChart: {
    width: isTablet ? '48%' : '100%',
  },
  // LEGO stud styles
  legoStud: {
    width: 16,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444546',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  legoStudInner: {
    width: 10,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#333436',
  },
});