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
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import AuthCheck from '../../components/AuthCheck';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { searchFilterProducts } from '../../redux/slices/productSlice';
import { fetchAdminOrders } from '../../redux/slices/orderSlices';
import axios from 'axios';
import { API_BASE_URL } from '../../env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// Get screen dimensions and set up responsive sizing
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isIOS = Platform.OS === 'ios';

// LEGO brand colors for professional theming
const LEGO_COLORS = {
  red: '#E3000B',
  yellow: '#FFD500',
  blue: '#006DB7',
  green: '#00AF4D',
  black: '#000000',
  darkGrey: '#333333',
  lightGrey: '#F2F2F2',
  white: '#FFFFFF',
};

// LEGO-inspired shadow for 3D effect
const LEGO_SHADOW = {
  shadowColor: LEGO_COLORS.black,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 6,
};

// LEGO stud design for decorative elements
const Stud = ({ color = LEGO_COLORS.red, size = 12 }) => (
  <View style={{
    width: size,
    height: size,
    borderRadius: size/2,
    backgroundColor: color,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    marginHorizontal: 3,
  }} />
);

// Responsive sizing utility
const getResponsiveSize = (size, factor = 0.05) => {
  return Math.round(Math.min(screenWidth, screenHeight) * factor) + size;
};

// Default chart data (used before orders load)
const defaultSalesData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      data: [0, 0, 0, 0, 0, 0],
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

const AdminDashboard = () => {
  const [dimensions, setDimensions] = useState({ screenWidth, screenHeight });
  const [productStats, setProductStats] = useState({
    totalProducts: 0,
    setCount: 0,
    minifigureCount: 0,
    pieceCount: 0,
    lowStock: 0
  });
  const [categoryPieData, setCategoryPieData] = useState(pieData);
  const [salesData, setSalesData] = useState(defaultSalesData);
  const [totalSales, setTotalSales] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [averageOrderValue, setAverageOrderValue] = useState(0);
  
  // User data state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);

  // Get products and orders from Redux store
  const dispatch = useAppDispatch();
  const { items: products } = useAppSelector(state => state.products);
  const { orders, loading: ordersLoading, error: ordersError } = useAppSelector(state => state.orders);

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

  // Fetch user data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const token = await AsyncStorage.getItem('userToken');
        
        if (!token) {
          console.error('No auth token found');
          return;
        }
        
        const response = await axios.get(`${API_BASE_URL}/users`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setUsers(response.data);
        setUsersError(null);
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsersError('Failed to load users');
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Fetch product data and calculate statistics
  useEffect(() => {
    const fetchProductData = async () => {
      // Load all products
      dispatch(searchFilterProducts({ limit: 500 }));
    };

    fetchProductData();
  }, [dispatch]);

  // Fetch orders data
  useEffect(() => {
    dispatch(fetchAdminOrders());
  }, [dispatch]);

  // Process order data when orders state changes
  useEffect(() => {
    if (orders && orders.length > 0) {
      // Calculate total sales and average order value
      const total = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const avgOrder = total / orders.length;
      
      setTotalSales(total);
      setOrderCount(orders.length);
      setAverageOrderValue(avgOrder);
      
      // Process orders for sales chart
      const monthlySales = processMonthlySales(orders);
      setSalesData(monthlySales);
    }
  }, [orders]);

  // Process product data when products state changes
  useEffect(() => {
    if (products && products.length > 0) {
      // Calculate statistics
      const setCount = products.filter(p => p.category === 'Set').length;
      const minifigureCount = products.filter(p => p.category === 'Minifigure').length;
      const pieceCount = products.filter(p => p.category === 'Piece').length;
      const lowStockCount = products.filter(p => p.stock !== undefined && p.stock < 10).length;

      // Update state with counts
      setProductStats({
        totalProducts: products.length,
        setCount,
        minifigureCount,
        pieceCount,
        lowStock: lowStockCount
      });

      // Update pie chart data with real category percentages
      const newPieData = [
        { 
          name: 'Sets', 
          population: setCount, 
          color: '#F44336', 
          legendFontColor: '#7F7F7F', 
          legendFontSize: 12 
        },
        { 
          name: 'Minifigures', 
          population: minifigureCount, 
          color: '#2196F3', 
          legendFontColor: '#7F7F7F', 
          legendFontSize: 12 
        },
        { 
          name: 'Pieces', 
          population: pieceCount, 
          color: '#FFEB3B', 
          legendFontColor: '#7F7F7F', 
          legendFontSize: 12 
        }
      ];
      
      // Only update if we have actual data
      if (setCount > 0 || minifigureCount > 0 || pieceCount > 0) {
        setCategoryPieData(newPieData);
      }
    }
  }, [products]);

  // Process monthly sales data from orders
  const processMonthlySales = (orders) => {
    // Get current date info
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Create array of last 6 months (including current month)
    const months = [];
    const monthLabels = [];
    
    for (let i = 5; i >= 0; i--) {
      let monthIndex = currentMonth - i;
      let year = currentYear;
      
      if (monthIndex < 0) {
        monthIndex = 12 + monthIndex;
        year = currentYear - 1;
      }
      
      months.push({ month: monthIndex, year });
      
      // Get short month name for labels
      const monthLabel = new Date(year, monthIndex, 1).toLocaleString('default', { month: 'short' });
      monthLabels.push(monthLabel);
    }
    
    // Calculate sales for each month
    const monthlySalesData = Array(6).fill(0);
    
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const orderMonth = orderDate.getMonth();
      const orderYear = orderDate.getFullYear();
      
      // Check if this order falls within our 6-month window
      months.forEach((monthData, index) => {
        if (monthData.month === orderMonth && monthData.year === orderYear) {
          monthlySalesData[index] += order.total || 0;
        }
      });
    });
    
    return {
      labels: monthLabels,
      datasets: [
        {
          data: monthlySalesData.map(value => Math.round(value)),
        },
      ],
    };
  };

  // Chart configuration with LEGO colors
  const chartConfig = {
    backgroundGradientFrom: LEGO_COLORS.white,
    backgroundGradientTo: LEGO_COLORS.white,
    color: (opacity = 1) => `rgba(227, 0, 11, ${opacity})`, // LEGO red
    strokeWidth: 3,
    decimalPlaces: 0,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    propsForLabels: {
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
      fontSize: 12,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: LEGO_COLORS.blue,
    }
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

  // Navigate to user management
  const handleViewAllUsers = () => {
    router.push('/admin/users');
  };

  // Navigate to orders management
  const handleViewAllOrders = () => {
    router.push('/admin/orders');
  };

  // Get status color for order badges
  const getStatusColor = (status) => {
    switch(status) {
      case 'delivered': return LEGO_COLORS.green;
      case 'shipped': return LEGO_COLORS.yellow;
      case 'processing': return LEGO_COLORS.blue;
      case 'cancelled': return LEGO_COLORS.red;
      default: return '#9E9E9E'; // Gray for pending or unknown status
    }
  };

  // Format date to readable string
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `₱${amount.toFixed(2)}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AuthCheck requiredRole="admin" />
      
      <StatusBar barStyle="light-content" backgroundColor={LEGO_COLORS.red} />
      <View style={styles.container}>
        {/* Main Content */}
        <ScrollView 
          style={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentInner}
        >
          {/* Extra Space */}
          <View style={styles.headerSpacer} />
          
          {/* Page Title with LEGO-like header */}
          <View style={styles.pageHeader}>
            <View style={styles.logoContainer}>
              <View style={styles.logoStuds}>
                {[...Array(4)].map((_, i) => (
                  <Stud key={i} color={LEGO_COLORS.yellow} size={14} />
                ))}
              </View>
              <Text style={styles.pageHeaderTitle}>Admin Dashboard</Text>
            </View>
            <Text style={styles.pageHeaderSubtitle}>Welcome the Admin Dashboard</Text>
          </View>
          
          {/* Stats Overview - Styled as LEGO bricks */}
          <View style={styles.statsContainerGrid}>
            <View style={[styles.statCard, { backgroundColor: LEGO_COLORS.red }]}>
              <View style={styles.statStuds}>
                <Stud color={LEGO_COLORS.red} />
                <Stud color={LEGO_COLORS.red} />
              </View>
              <Text style={styles.statNumber}>{productStats.totalProducts}</Text>
              <Text style={styles.statLabel}>Total Products</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: LEGO_COLORS.blue }]}>
              <View style={styles.statStuds}>
                <Stud color={LEGO_COLORS.blue} />
                <Stud color={LEGO_COLORS.blue} />
              </View>
              <Text style={styles.statNumber}>{orderCount}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: LEGO_COLORS.green }]}>
              <View style={styles.statStuds}>
                <Stud color={LEGO_COLORS.green} />
                <Stud color={LEGO_COLORS.green} />
              </View>
              <Text style={styles.statNumber}>{formatCurrency(totalSales)}</Text>
              <Text style={styles.statLabel}>Total Sales</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: LEGO_COLORS.yellow }]}>
              <View style={styles.statStuds}>
                <Stud color={LEGO_COLORS.yellow} />
                <Stud color={LEGO_COLORS.yellow} />
              </View>
              <Text style={[styles.statNumber, { color: LEGO_COLORS.black }]}>{formatCurrency(averageOrderValue)}</Text>
              <Text style={[styles.statLabel, { color: LEGO_COLORS.black }]}>Avg. Order</Text>
            </View>
          </View>

          {/* Charts - responsive layout based on screen size */}
          {isSmallScreen ? (
            // Stack charts vertically on small screens
            <View>
              {/* Sales Chart */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderBar}>
                  <Text style={styles.sectionTitle}>Sales Overview (Last 6 Months)</Text>
                  <View style={styles.headerStuds}>
                    <Stud color={LEGO_COLORS.blue} />
                    <Stud color={LEGO_COLORS.red} />
                  </View>
                </View>
                <View style={styles.chartContainer}>
                  {ordersLoading ? (
                    <View style={styles.chartLoadingContainer}>
                      <ActivityIndicator size="large" color={LEGO_COLORS.blue} />
                      <Text style={styles.chartLoadingText}>Building sales data...</Text>
                    </View>
                  ) : (
                    <LineChart
                      data={salesData}
                      width={getChartWidth()}
                      height={200}
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => `rgba(0, 109, 183, ${opacity})`, // LEGO blue
                      }}
                      bezier
                      style={styles.chart}
                    />
                  )}
                </View>
              </View>

              {/* Category Distribution */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderBar}>
                  <Text style={styles.sectionTitle}>Category Distribution</Text>
                  <View style={styles.headerStuds}>
                    <Stud color={LEGO_COLORS.yellow} />
                    <Stud color={LEGO_COLORS.green} />
                  </View>
                </View>
                <View style={styles.chartContainer}>
                  <PieChart
                    data={categoryPieData}
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
                <View style={styles.sectionHeaderBar}>
                  <Text style={styles.sectionTitle}>Sales Overview (Last 6 Months)</Text>
                  <View style={styles.headerStuds}>
                    <Stud color={LEGO_COLORS.blue} />
                    <Stud color={LEGO_COLORS.red} />
                  </View>
                </View>
                <View style={styles.chartContainer}>
                  {ordersLoading ? (
                    <View style={styles.chartLoadingContainer}>
                      <ActivityIndicator size="large" color={LEGO_COLORS.blue} />
                      <Text style={styles.chartLoadingText}>Building sales data...</Text>
                    </View>
                  ) : (
                    <LineChart
                      data={salesData}
                      width={getChartWidth()}
                      height={200}
                      chartConfig={{
                        ...chartConfig,
                        color: (opacity = 1) => `rgba(0, 109, 183, ${opacity})`, // LEGO blue
                      }}
                      bezier
                      style={styles.chart}
                    />
                  )}
                </View>
              </View>

              {/* Category Distribution */}
              <View style={[styles.sectionContainer, styles.columnItem]}>
                <View style={styles.sectionHeaderBar}>
                  <Text style={styles.sectionTitle}>Category Distribution</Text>
                  <View style={styles.headerStuds}>
                    <Stud color={LEGO_COLORS.yellow} />
                    <Stud color={LEGO_COLORS.green} />
                  </View>
                </View>
                <View style={styles.chartContainer}>
                  <PieChart
                    data={categoryPieData}
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

          {/* User Management Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderBar}>
              <Text style={styles.sectionTitle}>User Management</Text>
              <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAllUsers}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.tableContainer}>
              {usersLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={LEGO_COLORS.red} />
                  <Text style={styles.loadingText}>Assembling user data...</Text>
                </View>
              ) : usersError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{usersError}</Text>
                </View>
              ) : users.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No minifigures found</Text>
                </View>
              ) : isSmallScreen ? (
                // Card-based layout for small screens
                <View style={styles.cardList}>
                  {users.slice(0, 4).map((user) => (
                    <View key={user._id} style={styles.userCard}>
                      <View style={styles.userCardHeader}>
                        <Text style={styles.userCardName}>{user.username}</Text>
                        <View style={[styles.roleBadge, 
                          user.role === 'admin' ? styles.adminBadge : 
                          user.role === 'moderator' ? styles.moderatorBadge : styles.userBadge
                        ]}>
                          <Text style={styles.roleText}>{user.role}</Text>
                        </View>
                      </View>
                      <Text style={styles.userCardEmail}>{user.email}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                // Table layout for larger screens
                <View>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Username</Text>
                    <Text style={[styles.tableHeaderText, { flex: 2 }]}>Email</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Role</Text>
                  </View>
                  {users.slice(0, 4).map((user) => (
                    <View key={user._id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>{user.username}</Text>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{user.email}</Text>
                      <View style={[styles.roleBadge, 
                        user.role === 'admin' ? styles.adminBadge : 
                        user.role === 'moderator' ? styles.moderatorBadge : styles.userBadge
                      ]}>
                        <Text style={styles.roleText}>{user.role}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Recent Orders - with real data */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderBar}>
              <Text style={styles.sectionTitle}>Recent Orders</Text>
              <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAllOrders}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.tableContainer}>
              {ordersLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={LEGO_COLORS.blue} />
                  <Text style={styles.loadingText}>Building order list...</Text>
                </View>
              ) : ordersError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{ordersError}</Text>
                </View>
              ) : orders.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No orders found</Text>
                </View>
              ) : isSmallScreen ? (
                // Card-based layout for small screens instead of a table
                <View style={styles.cardList}>
                  {orders.slice(0, 4).map((order) => (
                    <View key={order._id || order.orderId} style={styles.orderCard}>
                      {/* Order ID at top */}
                      <Text style={styles.orderCardId}>Order #{order.orderId}</Text>
                      
                      {/* Status badge moved above order name, full width */}
                      <View style={[
                        styles.statusBadge, 
                        { backgroundColor: getStatusColor(order.status) },
                        styles.fullWidthStatusBadge
                      ]}>
                        <Text style={[styles.statusText, 
                          order.status === 'shipped' ? {color: LEGO_COLORS.black} : {color: LEGO_COLORS.white}
                        ]}>{order.status}</Text>
                      </View>
                      
                      {/* Make customer name more visible */}
                      <Text style={styles.orderCardCustomer}>
                        {order.shippingDetails?.name || 'Unknown Customer'}
                      </Text>
                      
                      <View style={styles.orderMeta}>
                        <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                        <Text style={styles.orderCardTotal}>{formatCurrency(order.total || 0)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                // Table layout for larger screens
                <View>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 0.7 }]}>Order ID</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Customer</Text>
                    <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Date</Text>
                    <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Total</Text>
                  </View>
                  {orders.slice(0, 5).map((order) => (
                    <View key={order._id || order.orderId} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 0.7 }]}>#{order.orderId}</Text>
                      <View style={[
                        styles.statusBadge, 
                        { backgroundColor: getStatusColor(order.status), flex: 1 }
                      ]}>
                        <Text style={[styles.statusText, 
                          order.status === 'shipped' ? {color: LEGO_COLORS.black} : {color: LEGO_COLORS.white}
                        ]}>{order.status}</Text>
                      </View>
                      <Text style={[styles.tableCell, { flex: 1.5, fontWeight: 'bold' }]}>
                        {order.shippingDetails?.name || 'Unknown Customer'}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 0.8 }]}>{formatDate(order.createdAt)}</Text>
                      <Text style={[styles.tableCell, { flex: 0.8 }]}>{formatCurrency(order.total || 0)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
          
          {/* LEGO footer decoration */}
          <View style={styles.legoFooter}>
            {[...Array(8)].map((_, i) => (
              <Stud key={i} color={i % 2 === 0 ? LEGO_COLORS.red : LEGO_COLORS.blue} size={16} />
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LEGO_COLORS.red, // LEGO red for consistent look in notch area
  },
  container: {
    flex: 1,
    backgroundColor: LEGO_COLORS.lightGrey,
    paddingTop: Platform.OS === 'android' ? 10 : 0, // Add some padding on Android
  },
  contentContainer: {
    flex: 1,
  },
  contentInner: {
    padding: 20,
    paddingTop: 10, // Reduce top padding since we have the spacer
    paddingBottom: 40, // Extra padding at bottom for scrolling past the last item
  },
  headerSpacer: {
    height: Platform.OS === 'ios' ? 15 : 25, // More space on Android
    width: '100%',
  },
  pageHeader: {
    marginBottom: 24,
    marginTop: 10, // Add top margin
    borderBottomWidth: 4,
    borderBottomColor: LEGO_COLORS.yellow,
    paddingBottom: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoStuds: {
    flexDirection: 'row',
    marginRight: 10,
  },
  pageHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: LEGO_COLORS.black,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-black',
      }
    })
  },
  pageHeaderSubtitle: {
    fontSize: 16,
    color: LEGO_COLORS.darkGrey,
    marginTop: 8,
    marginLeft: 4,
  },
  statsContainerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%', // Two columns for all screen sizes
    padding: 15,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    borderWidth: 3,
    borderColor: LEGO_COLORS.black,
    ...LEGO_SHADOW
  },
  statStuds: {
    flexDirection: 'row',
    position: 'absolute',
    top: -8,
    left: '30%',
  },
  statNumber: {
    fontSize: getResponsiveSize(18, 0.01),
    fontWeight: 'bold',
    color: LEGO_COLORS.white,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-black',
      }
    })
  },
  statLabel: {
    fontSize: getResponsiveSize(14, 0.005),
    color: LEGO_COLORS.white,
    marginTop: 8,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
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
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  sectionHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: LEGO_COLORS.yellow,
    paddingBottom: 12,
    marginBottom: 15,
  },
  headerStuds: {
    flexDirection: 'row',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: LEGO_COLORS.black,
    ...Platform.select({
      ios: {
        fontFamily: 'System',
      },
      android: {
        fontFamily: 'sans-serif-medium',
      }
    })
  },
  viewAllButton: {
    backgroundColor: LEGO_COLORS.blue,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: LEGO_COLORS.black,
    ...LEGO_SHADOW
  },
  viewAllText: {
    fontSize: 12,
    color: LEGO_COLORS.white,
    fontWeight: 'bold',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  chart: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LEGO_COLORS.lightGrey,
  },
  tableContainer: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: LEGO_COLORS.blue,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  tableHeaderText: {
    fontWeight: 'bold',
    color: LEGO_COLORS.white,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: LEGO_COLORS.lightGrey,
    alignItems: 'center',
  },
  tableCell: {
    color: LEGO_COLORS.darkGrey,
  },
  cardList: {
    flexDirection: 'column',
  },
  orderCard: {
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  orderCardId: {
    fontWeight: 'bold',
    color: LEGO_COLORS.black,
    fontSize: 16,
    marginBottom: 10,
  },
  orderCardCustomer: {
    fontSize: 17,
    color: LEGO_COLORS.darkGrey,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 5,
  },
  orderCardTotal: {
    fontSize: 14,
    color: LEGO_COLORS.black,
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: LEGO_COLORS.darkGrey,
    minWidth: 70,
  },
  fullWidthStatusBadge: {
    width: '100%',
    borderRadius: 6,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: LEGO_COLORS.darkGrey,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: LEGO_COLORS.lightGrey,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LEGO_COLORS.red,
  },
  errorText: {
    color: LEGO_COLORS.red,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: LEGO_COLORS.darkGrey,
    fontSize: 14,
  },
  userCard: {
    backgroundColor: LEGO_COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: LEGO_COLORS.darkGrey,
    ...LEGO_SHADOW
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  userCardName: {
    fontWeight: 'bold',
    color: LEGO_COLORS.black,
    fontSize: 15,
  },
  userCardEmail: {
    fontSize: 14,
    color: LEGO_COLORS.darkGrey,
  },
  roleBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 100,
    minWidth: 70,
    borderWidth: 1,
    borderColor: LEGO_COLORS.darkGrey,
  },
  adminBadge: {
    backgroundColor: LEGO_COLORS.red,
  },
  moderatorBadge: {
    backgroundColor: LEGO_COLORS.blue,
  },
  userBadge: {
    backgroundColor: LEGO_COLORS.green,
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: LEGO_COLORS.white,
    textTransform: 'capitalize',
  },
  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  orderDate: {
    fontSize: 13,
    color: LEGO_COLORS.darkGrey,
  },
  chartLoadingContainer: {
    height: 200,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: LEGO_COLORS.lightGrey,
    borderRadius: 8,
  },
  chartLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: LEGO_COLORS.darkGrey,
    fontWeight: 'bold',
  },
  legoFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
  },
});

export default AdminDashboard;