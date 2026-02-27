/**
 * HomeScreen - O'PIED DU MONT Mobile
 * Filtrage par rôles - Accès Stock ouvert aux serveurs
 */

import { ScrollView, Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
// @ts-ignore
import { ScreenContainer } from "@/components/screen-container";
// @ts-ignore
import { useApp } from "@/lib/app-context";
// @ts-ignore
import { useColors } from "@/hooks/use-colors";
// @ts-ignore
import { formatPrice } from "@/lib/formatting";

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
    label: 'Stock', 
    icon: '📦', 
    route: 'stock', 
    color: '#D4A574',
    // MAJ : Ajout de 'waiter' pour la gestion des boissons/jus
    allowedRoles: ['admin', 'manager', 'chef', 'waiter'] 
  },
  { 
    id: '3', 
    label: 'Menu', 
    icon: '🍽️', 
    route: 'menu', 
    color: '#6BA55D',
    allowedRoles: ['admin', 'manager', 'chef'] 
  },
  { 
    id: '4', 
    label: 'Employés', 
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
  
  const userRole = state.user?.role || 'staff';
  const userName = state.user?.name || 'Utilisateur';

  // Filtrage des actions selon le rôle
  const filteredActions = QUICK_ACTIONS.filter(action => 
    action.allowedRoles.includes(userRole)
  );

  const handleQuickAction = (route: string) => {
    router.push(`/(tabs)/${route}` as any);
  };

  // Sécurité pour les commandes récentes
  const recentOrders = state.orders ? state.orders.slice(-3).reverse() : [];

  return (
    <ScreenContainer style={{ padding: 16 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.gap6}>
          
          {/* Section En-tête */}
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Bienvenue
            </Text>
            <View style={styles.rowCenter}>
              <Text style={{ color: colors.muted, fontSize: 14 }}>
                {userName}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold' }}>
                  {userRole.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Grille d'actions filtrée */}
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Actions rapides
            </Text>
            <View style={styles.actionGrid}>
              {filteredActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.actionCard, { backgroundColor: action.color }]}
                  onPress={() => handleQuickAction(action.route)}
                >
                  <Text style={{ fontSize: 24, marginBottom: 8 }}>{action.icon}</Text>
                  <Text style={styles.actionLabel}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Commandes récentes (Visible pour staff de salle et gestion) */}
          {['admin', 'manager', 'cashier', 'waiter'].includes(userRole) && recentOrders.length > 0 && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Dernières ventes
              </Text>
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
                      <Text style={{ fontWeight: '600', color: colors.foreground }}>
                        #{order.id.toString().slice(-6)}
                      </Text>
                      <Text style={{ fontSize: 14, color: colors.muted }}>
                        {order.status === 'completed' ? '✅' : '⏳'}
                      </Text>
                    </View>
                    <View style={styles.rowBetween}>
                      <Text style={{ fontSize: 12, color: colors.muted }}>
                        {order.items?.length || 0} article(s)
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.primary }}>
                        {formatPrice(order.total || 0)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Statistiques (Uniquement Admin/Manager) */}
          {['admin', 'manager'].includes(userRole) && (
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{state.orders?.length || 0}</Text>
                <Text style={styles.statLabel}>Ventes</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{state.menuItems?.length || 0}</Text>
                <Text style={styles.statLabel}>Menu</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{state.employees?.length || 0}</Text>
                <Text style={styles.statLabel}>Staff</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  gap6: { gap: 24 },
  title: { fontSize: 30, fontWeight: 'bold' },
  rowCenter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleBadge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: '47%', borderRadius: 16, padding: 20, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  actionLabel: { color: 'white', fontWeight: 'bold', fontSize: 15, textAlign: 'center' },
  ordersContainer: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  orderRow: { padding: 16, gap: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#94a3b8', marginTop: 4, textAlign: 'center', fontWeight: '600' }
});