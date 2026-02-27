# Design - O'PIED DU MONT Mobile

## Overview

O'PIED DU MONT is a restaurant management mobile app designed for iOS and Android. The app enables staff to manage point-of-sale operations, inventory, menu items, and employee management on the go. The interface is optimized for portrait orientation (9:16) and one-handed usage on modern smartphones.

## Screen List

1. **Login** — User authentication with email/password
2. **Home** — Dashboard with quick actions and recent activity
3. **Caisse (POS)** — Point-of-sale interface for taking orders
4. **Stock** — Inventory management and stock levels
5. **Menu** — Menu and recipe management
6. **Employés** — Employee management and scheduling
7. **Rapports** — Reports and analytics
8. **Paramètres** — Settings and configuration

## Primary Content and Functionality

### Login Screen
- Email input field
- Password input field
- Login button
- Error message display
- Loading state during authentication

### Home Screen
- Welcome message with user name
- Quick action buttons (Caisse, Stock, Menu, Employés)
- Recent transactions list
- Navigation tabs at bottom

### Caisse (POS) Screen
- Product/menu item list (scrollable)
- Selected items cart
- Item quantity controls
- Total price display
- Payment method selection
- Complete order button
- Clear cart button

### Stock Screen
- Product inventory list
- Stock level indicators (low/normal/high)
- Search/filter functionality
- Add/edit stock quantities
- Stock history view

### Menu Screen
- Menu categories (Entrées, Grillades, Boissons, Desserts, etc.)
- Menu items with descriptions and prices
- Add/edit/delete menu items
- Recipe management

### Employés Screen
- Employee list
- Employee details (name, role, schedule)
- Add/edit employee
- Schedule management
- Performance metrics

### Rapports Screen
- Sales reports
- Inventory reports
- Employee performance reports
- Date range filtering
- Export functionality

### Paramètres Screen
- Account settings
- Restaurant configuration
- Theme/appearance settings
- Notification preferences
- Logout button

## Key User Flows

### Flow 1: Taking an Order (Caisse)
1. User taps Caisse tab
2. User selects items from menu
3. System adds items to cart with quantity controls
4. User reviews cart total
5. User selects payment method
6. User taps "Complete Order"
7. System confirms order and clears cart

### Flow 2: Checking Inventory (Stock)
1. User taps Stock tab
2. System displays current inventory
3. User searches for specific item (optional)
4. User taps item to view details
5. User adjusts stock quantity if needed
6. System saves changes

### Flow 3: Managing Menu (Menu)
1. User taps Menu tab
2. System displays menu categories
3. User taps category to view items
4. User can add/edit/delete items
5. User manages recipes and prices
6. System saves changes

### Flow 4: Employee Management (Employés)
1. User taps Employés tab
2. System displays employee list
3. User can view employee details
4. User can add new employee
5. User can edit employee information
6. User can manage schedules
7. System saves changes

## Color Scheme

The app uses an "Earth" color palette inspired by O'PIED DU MONT's brand:

- **Primary**: #8B6F47 (Warm brown - main accent)
- **Secondary**: #D4A574 (Light tan - secondary accent)
- **Background**: #FEFDFB (Off-white - light backgrounds)
- **Surface**: #F5F3F0 (Light beige - card backgrounds)
- **Foreground**: #2C2C2C (Dark brown - text)
- **Muted**: #8B8B8B (Gray - secondary text)
- **Border**: #E5E0D8 (Light beige - borders)
- **Success**: #6BA55D (Green - success states)
- **Warning**: #D4A574 (Tan - warning states)
- **Error**: #C85A54 (Rust - error states)

## Design Principles

1. **Mobile-First**: All layouts optimized for portrait orientation (9:16)
2. **One-Handed Usage**: Key controls positioned within thumb reach
3. **iOS-Native Feel**: Follows Apple Human Interface Guidelines
4. **Clarity**: Clear visual hierarchy and information architecture
5. **Efficiency**: Minimal taps to complete common tasks
6. **Accessibility**: Sufficient contrast ratios and touch targets (44pt minimum)

## Navigation Structure

- **Tab Bar** (Bottom): Home, Caisse, Stock, Menu, Employés, Rapports, Paramètres
- **Modal Sheets**: For forms (add/edit items, employees)
- **Stack Navigation**: For detail views within each tab

## Typography

- **Headings**: SF Pro Display (iOS) / Roboto Bold (Android)
- **Body**: SF Pro Text (iOS) / Roboto Regular (Android)
- **Monospace**: Menlo (iOS) / Roboto Mono (Android) for prices/numbers

## Spacing & Layout

- **Padding**: 16pt standard, 8pt compact
- **Margins**: 16pt between sections
- **Corner Radius**: 12pt for cards, 8pt for buttons
- **Line Height**: 1.5× for body text, 1.2× for headings

## Interactive Elements

- **Buttons**: Minimum 44pt height, filled or outlined
- **Inputs**: 44pt height, clear labels above
- **Cards**: Tappable with visual feedback (opacity change)
- **Haptic Feedback**: Light impact on button taps, success notification on order completion
