import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import AuthCheck from '../../components/AuthCheck';

// Get screen dimensions and set up responsive sizing
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';

// Responsive sizing utility
const getResponsiveSize = (size, factor = 0.05) => {
  return Math.round(Math.min(screenWidth, screenHeight) * factor) + size;
};

// Mock data
const userData = [
  { id: 1, name: 'John Builder', role: 'Administrator', lastActive: '2 hours ago', sets: 124 },
  { id: 2, name: 'Emma Bricks', role: 'Moderator', lastActive: '1 day ago', sets: 87 },
  { id: 3, name: 'Mike Blocks', role: 'Content Creator', lastActive: '5 mins ago', sets: 219 },
  { id: 4, name: 'Sarah Plates', role: 'Inventory Manager', lastActive: '3 hours ago', sets: 156 },
];

const inventoryData = [
  { id: 1, setNumber: '10276', name: 'Colosseum', stock: 12, backorder: 56 },
  { id: 2, setNumber: '75192', name: 'Millennium Falcon', stock: 8, backorder: 120 },
  { id: 3, setNumber: '21322', name: 'Pirates of Barracuda Bay', stock: 23, backorder: 15 },
  { id: 4, setNumber: '71741', name: 'NINJAGO City Gardens', stock: 4, backorder: 67 },
];

const salesData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      data: [350, 420, 380, 510, 490, 580],
    },
  ],
};

const pieData = [
  { name: 'Star Wars', population: 25, color: '#F44336', legendFontColor: '#7F7F7F', legendFontSize: 12 },
  { name: 'City', population: 18, color: '#2196F3', legendFontColor: '#7F7F7F', legendFontSize: 12 },
  { name: 'Technic', population: 15, color: '#FFEB3B', legendFontColor: '#7F7F7F', legendFontSize: 12 },
  { name: 'Friends', population: 12, color: '#4CAF50', legendFontColor: '#7F7F7F', legendFontSize: 12 },
  { name: 'Creator', population: 20, color: '#FF9800', legendFontColor: '#7F7F7F', legendFontSize: 12 },
  { name: 'Other', population: 10, color: '#9C27B0', legendFontColor: '#7F7F7F', legendFontSize: 12 },
];

const recentOrders = [
  { id: '#28734', customer: 'Alex Johnson', sets: ['10276', '75192'], total: '$749.98', status: 'Delivered' },
  { id: '#28733', customer: 'Maria Garcia', sets: ['21322'], total: '$199.99', status: 'Processing' },
  { id: '#28732', customer: 'Robert Lee', sets: ['71741', '10276'], total: '$549.98', status: 'Shipped' },
  { id: '#28731', customer: 'Lisa Wong', sets: ['75192'], total: '$799.99', status: 'Pending' },
];

const AdminDashboard = () => {
  const [dimensions, setDimensions] = useState({ screenWidth, screenHeight });

  // Handle orientation changes
  useEffect(() => {
    const onChange = ({ window }) => {
      setDimensions({
        screenWidth: window.width,
        screenHeight: window.height
      });
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`,
    strokeWidth: 2,
    decimalPlaces: 0,
    barPercentage: 0.6,
  };

  // Determine chart widths based on device width for responsive design
  const getChartWidth = () => {
    if (dimensions.screenWidth < 600) {
      return dimensions.screenWidth - 40; // Full width minus padding
    }
    return dimensions.screenWidth * 0.46;
  };

  // Handle orientation changes and different device sizes
  const isSmallScreen = dimensions.screenWidth < 600;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthCheck requiredRole="admin" />
      
      <StatusBar barStyle="light-content" backgroundColor="#c41818" />
      <View style={styles.container}>
        {/* Main Content */}
        <ScrollView 
          style={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentInner}
        >
          {/* Page Title */}
          <View style={styles.pageHeader}>
            <Text style={styles.pageHeaderTitle}>Dashboard</Text>
            <Text style={styles.pageHeaderSubtitle}>Welcome to your admin dashboard</Text>
          </View>
          
          {/* Stats Overview - Grid for all screen sizes */}
          <View style={styles.statsContainerGrid}>
            <View style={[styles.statCard, { backgroundColor: '#F44336' }]}>
              <Text style={styles.statNumber}>1,248</Text>
              <Text style={styles.statLabel}>Total Sets</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#2196F3' }]}>
              <Text style={styles.statNumber}>$43.5K</Text>
              <Text style={styles.statLabel}>Monthly Sales</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.statNumber}>18,356</Text>
              <Text style={styles.statLabel}>Active Users</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FF9800' }]}>
              <Text style={styles.statNumber}>45</Text>
              <Text style={styles.statLabel}>Low Stock</Text>
            </View>
          </View>

          {/* Charts - responsive layout based on screen size */}
          {isSmallScreen ? (
            // Stack charts vertically on small screens
            <View>
              {/* Sales Chart */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Sales Overview</Text>
                <View style={styles.chartContainer}>
                  <LineChart
                    data={salesData}
                    width={getChartWidth()}
                    height={200}
                    chartConfig={{
                      ...chartConfig,
                      color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                    }}
                    bezier
                    style={styles.chart}
                  />
                </View>
              </View>

              {/* Category Distribution */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Category Distribution</Text>
                <View style={styles.chartContainer}>
                  <PieChart
                    data={pieData}
                    width={getChartWidth()}
                    height={200}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                  />
                </View>
              </View>
            </View>
          ) : (
            // Two column layout for larger screens
            <View style={styles.twoColumnContainer}>
              {/* Sales Chart */}
              <View style={[styles.sectionContainer, styles.columnItem]}>
                <Text style={styles.sectionTitle}>Sales Overview</Text>
                <View style={styles.chartContainer}>
                  <LineChart
                    data={salesData}
                    width={getChartWidth()}
                    height={200}
                    chartConfig={{
                      ...chartConfig,
                      color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                    }}
                    bezier
                    style={styles.chart}
                  />
                </View>
              </View>

              {/* Category Distribution */}
              <View style={[styles.sectionContainer, styles.columnItem]}>
                <Text style={styles.sectionTitle}>Category Distribution</Text>
                <View style={styles.chartContainer}>
                  <PieChart
                    data={pieData}
                    width={getChartWidth()}
                    height={200}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    absolute
                  />
                </View>
              </View>
            </View>
          )}

          {/* Recent Orders - simplified for mobile */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Orders</Text>
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.tableContainer}>
              {isSmallScreen ? (
                // Card-based layout for small screens instead of a table
                <View style={styles.cardList}>
                  {recentOrders.map((order) => (
                    <View key={order.id} style={styles.orderCard}>
                      <View style={styles.orderCardHeader}>
                        <Text style={styles.orderCardId}>{order.id}</Text>
                        <View style={[
                          styles.statusBadge, 
                          order.status === 'Delivered' ? styles.deliveredBadge :
                          order.status === 'Shipped' ? styles.shippedBadge :
                          order.status === 'Processing' ? styles.processingBadge :
                          styles.pendingBadge
                        ]}>
                          <Text style={styles.statusText}>{order.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.orderCardCustomer}>{order.customer}</Text>
                      <Text style={styles.orderCardTotal}>{order.total}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                // Table layout for larger screens
                <View>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 0.7 }]}>Order</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Customer</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Total</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
                  </View>
                  {recentOrders.map((order) => (
                    <View key={order.id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 0.7 }]}>{order.id}</Text>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>{order.customer}</Text>
                      <Text style={[styles.tableCell, { flex: 1 }]}>{order.total}</Text>
                      <View style={[styles.statusBadge, 
                        order.status === 'Delivered' ? styles.deliveredBadge :
                        order.status === 'Shipped' ? styles.shippedBadge :
                        order.status === 'Processing' ? styles.processingBadge :
                        styles.pendingBadge
                      ]}>
                        <Text style={styles.statusText}>{order.status}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Inventory Overview - simplified for mobile */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Low Stock Inventory</Text>
              <TouchableOpacity style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.tableContainer}>
              {isSmallScreen ? (
                // Card-based layout for small screens instead of a table
                <View style={styles.cardList}>
                  {inventoryData.map((item) => (
                    <View key={item.id} style={styles.inventoryCard}>
                      <View style={styles.inventoryCardHeader}>
                        <Text style={styles.inventoryCardSetNumber}>{item.setNumber}</Text>
                        <Text style={[
                          styles.inventoryCardStock, 
                          { color: item.stock < 10 ? '#F44336' : '#4CAF50' }
                        ]}>
                          Stock: {item.stock}
                        </Text>
                      </View>
                      <Text style={styles.inventoryCardName}>{item.name}</Text>
                      <Text style={styles.inventoryCardBackorder}>Backorder: {item.backorder}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                // Table layout for larger screens
                <View>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Set #</Text>
                    <Text style={[styles.tableHeaderText, { flex: 2 }]}>Name</Text>
                    <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Stock</Text>
                    <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Backorder</Text>
                  </View>
                  {inventoryData.map((item) => (
                    <View key={item.id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 1 }]}>{item.setNumber}</Text>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{item.name}</Text>
                      <Text style={[styles.tableCell, { flex: 0.8, color: item.stock < 10 ? '#F44336' : '#4CAF50' }]}>
                        {item.stock}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 0.8 }]}>{item.backorder}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#e01a1a', // Match header color for consistent look in notch area
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
    paddingBottom: 40, // Extra padding at bottom for scrolling past the last item
  },
  pageHeader: {
    marginBottom: 20,
  },
  pageHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  pageHeaderSubtitle: {
    fontSize: 16,
    color: '#666666',
  },
  statsContainerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%', // Two columns for all screen sizes
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    // Improved shadows for cross-platform
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statNumber: {
    fontSize: getResponsiveSize(16, 0.01),
    fontWeight: 'bold',
    color: '#ffffff',
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      }
    })
  },
  statLabel: {
    fontSize: getResponsiveSize(12, 0.005),
    color: '#ffffff',
    marginTop: 5,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif',
      }
    })
  },
  twoColumnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  columnItem: {
    flex: 1,
    marginHorizontal: 5,
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    // Shadow for iOS
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      // Elevation for Android
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  viewAllButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  viewAllText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  chart: {
    borderRadius: 8,
  },
  tableContainer: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  tableHeaderText: {
    fontWeight: 'bold',
    color: '#333333',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  tableCell: {
    color: '#333333',
  },
  cardList: {
    flexDirection: 'column',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderCardId: {
    fontWeight: 'bold',
    color: '#333333',
  },
  orderCardCustomer: {
    fontSize: 15,
    color: '#333333',
    marginBottom: 5,
  },
  orderCardTotal: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
  },
  inventoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  inventoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inventoryCardSetNumber: {
    fontWeight: 'bold',
    color: '#333333',
  },
  inventoryCardStock: {
    fontWeight: 'bold',
  },
  inventoryCardName: {
    fontSize: 15,
    color: '#333333',
    marginBottom: 5,
  },
  inventoryCardBackorder: {
    fontSize: 14,
    color: '#666666',
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  deliveredBadge: {
    backgroundColor: '#e6f7ed',
  },
  shippedBadge: {
    backgroundColor: '#e6f2ff',
  },
  processingBadge: {
    backgroundColor: '#fff8e6',
  },
  pendingBadge: {
    backgroundColor: '#f5f5f5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default AdminDashboard;