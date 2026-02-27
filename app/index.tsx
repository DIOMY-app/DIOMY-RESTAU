/**
 * HomeScreen - O'PIED DU MONT Mobile
 * Emplacement : /app/index.tsx
 * Correction : Suppression définitive de l'erreur TS sur la propriété 'name'
 */

import React from "react";
import { ScrollView, Text, View, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "../components/screen-container";
import { useApp } from "../app-context";
import { useColors } from "../hooks/use-colors";
import { formatPrice } from "../formatting";

const { width } = Dimensions.get('window');

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  route: string;
  color: string;
  allowedRoles: string[];
}

const QUICK_ACTIONS: QuickAction[] = [
  { 
    id: '1', 
    label: 'Caisse', 
    icon: '🛒', 
    route: 'caisse', 
    color: '#8B6F47',
    allowedRoles: ['admin', 'manager', 'waiter', 'cashier'] 
  },
  { 
    id: '2', 
    label: 'Cuisine', 
    icon: '👨‍🍳', 
    route: 'CuisineScreen', 
    color: '#EAB308',
    allowedRoles: ['admin', 'manager', 'chef', 'waiter'] 
  },
  { 
    id: '3', 
    label: 'Stock', 
    icon: 'stocks', 
    route: 'stocks', 
    color: '#D4A574',
    allowedRoles: ['admin', 'manager', 'chef'] 
  },
  { 
    id: '4', 
    label: 'Rapports', 
    icon: '📈', 
    route: 'RapportScreen', 
    color: '#6BA55D',
    allowedRoles: ['admin', 'manager'] 
  },
  { 
    id: '5', 
    label: 'Équipe', 
    icon: '👥', 
    route: 'employees', 
    color: '#C85A54',
    allowedRoles: ['admin', 'manager'] 
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state } = useApp();
  
  const user = state?.user;
  const userRole = user?.role || 'staff';
  
  // CORRECTION : On utilise uniquement 'nom' conformément à l'interface User
  const userName = user?.nom || 'Utilisateur';

  const filteredActions = QUICK_ACTIONS.filter(action => 
    action.allowedRoles.includes(userRole)
  );

  const todayOrders = state?.orders || [];
  const dailyTotal = todayOrders.reduce((acc: number, curr: any) => acc + (Number(curr.total) || 0), 0);

  const handleQuickAction = (route: string) => {
    // @ts-ignore
    router.push(`/${route}`);
  };

  const recentOrders = todayOrders.slice(-3).reverse();

  return (
    <ScreenContainer style={{ padding: 16 }}>
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gap6}>
          
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: colors.foreground }]}>O'PIED DU MONT</Text>
              <View style={styles.rowCenter}>
                <Text style={{ color: colors.muted, fontSize: 15, fontWeight: '500' }}>{userName}</Text>
                <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '900' }}>
                    {userRole.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.avatarCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push('/profile' as any)}
            >
              <Text style={{ fontSize: 20 }}>👤</Text>
            </TouchableOpacity>
          </View>

          {['admin', 'manager', 'cashier'].includes(userRole) && (
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{todayOrders.length}</Text>
                <Text style={styles.statLabel}>COMMANDES</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: '#22c55e' }]}>{formatPrice(dailyTotal)}</Text>
                <Text style={styles.statLabel}>CA DU JOUR</Text>
              </View>
            </View>
          )}

          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Services</Text>
            <View style={styles.actionGrid}>
              {filteredActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.actionCard, { backgroundColor: action.color }]}
                  onPress={() => handleQuickAction(action.route)}
                  activeOpacity={0.8}
                >
                  <View style={styles.iconCircle}>
                    <Text style={{ fontSize: 24 }}>{action.icon}</Text>
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {recentOrders.length > 0 && (
            <View>
              <View style={[styles.rowBetween, { marginBottom: 12 }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
                  Ventes récentes
                </Text>
                <TouchableOpacity onPress={() => router.push('/RapportScreen' as any)}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>Voir tout</Text>
                </TouchableOpacity>
              </View>
              
              <View style={[styles.ordersContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {recentOrders.map((order: any, index: number) => (
                  <View
                    key={order.id}
                    style={[
                      styles.orderRow,
                      index < recentOrders.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                    ]}
                  >
                    <View style={styles.rowBetween}>
                      <Text style={{ fontWeight: '800', color: colors.foreground }}>
                        #{order.id.toString().slice(-4).toUpperCase()}
                      </Text>
                      <View style={[styles.statusPill, { backgroundColor: order.statut === 'paye' ? '#dcfce7' : '#f1f5f9' }]}>
                         <Text style={{ fontSize: 10, fontWeight: 'bold', color: order.statut === 'paye' ? '#166534' : '#475569' }}>
                           {order.statut === 'paye' ? 'PAYÉ' : 'EN ATTENTE'}
                         </Text>
                      </View>
                    </View>
                    <View style={[styles.rowBetween, { marginTop: 8 }]}>
                      <Text style={{ fontSize: 12, color: colors.muted }}>
                        {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: colors.foreground }}>
                        {formatPrice(order.total || 0)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  gap6: { gap: 28 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  avatarCircle: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleBadge: { marginLeft: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '900', marginBottom: 18 },
  statsRow: { flexDirection: 'row', gap: 14 },
  statBox: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1.5, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, color: '#94a3b8', marginTop: 6, fontWeight: '800' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  actionCard: { 
    width: (width - 46) / 2, 
    borderRadius: 28, 
    padding: 20, 
    alignItems: 'center', 
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  iconCircle: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionLabel: { color: 'white', fontWeight: '900', fontSize: 16 },
  ordersContainer: { borderRadius: 24, borderWidth: 1.5, overflow: 'hidden' },
  orderRow: { padding: 20 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }
});