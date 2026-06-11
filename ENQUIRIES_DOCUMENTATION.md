# Practical Homes CRM - Enquiries Page

## Overview
The Enquiries page has been built using React with TypeScript and Tailwind CSS, following the design specifications provided. It features a complete CRM interface for managing real estate enquiries with multiple views, filtering, and detailed modal interactions.

## Features Implemented

### 1. **Main Enquiries Page** (`resources/js/pages/enquiries.tsx`)
- **Multiple Views**: Cards, List, and Kanban pipeline views
- **Real-time Search**: Filter by name, phone, postcode, and email
- **Advanced Filters**: 
  - Filter by sales rep
  - Filter by property type (H&L, KDRB, Contract, Duplex, etc.)
  - Filter by status (New, Contacted, Meeting, Deposits, Closed, Lost)
- **Statistics Dashboard**: Shows total enquiries, new leads, meetings, deposits, and alerts
- **Pagination**: 15 enquiries per page with navigation controls
- **Export Functionality**: Export all enquiries as CSV

### 2. **Detail Modal** (`resources/js/components/enquiry-detail-modal.tsx`)
Comprehensive enquiry detail view with:
- Contact information (phone, email, location)
- Enquiry details (type, source, lead source, deposit status)
- Enquiry notes
- Follow-up history timeline
- Status management (change status to any stage in the pipeline)
- Sales rep assignment/reassignment
- File management (upload, download, remove files)
- Add follow-up notes with file attachments
- Tracking of first contact timestamp

### 3. **Add Enquiry Modal** (`resources/js/components/add-enquiry-modal.tsx`)
New enquiry creation form with fields for:
- Client name (required)
- Phone and email
- Location/postcode
- Date
- Property type
- Sales rep assignment
- Source and lead source
- Enquiry notes

### 4. **Updated Navigation** 
Enhanced sidebar (`resources/js/components/app-sidebar.tsx`) with CRM-specific menu items:
- Dashboard
- Enquiries
- Alerts
- Team
- Leads
- Deposits
- Reports
- Status Report

## Data Structure

```typescript
interface Enquiry {
  id: number;
  date: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  lead: string;
  type: string;
  loc: string;
  rep: string;
  notes: string;
  fu: string; // follow-up notes
  dep1: string; // first deposit status
  dep2: string; // second deposit status
  status: string;
  firstContactTimestamp: string; // ISO timestamp for alert tracking
  files: File[];
}
```

## Alert System

The enquiries page includes an intelligent alert system:
- **Urgent Alert** (🔔): No response recorded for 24+ hours
- **Warning Alert** (⏰): No response recorded for 4+ hours
- **OK Status**: Up to date or terminal status reached

Alerts are cleared when:
- A follow-up note is added
- Status is changed
- 2nd deposit is recorded

## Views

### Cards View
- Grid layout (4 columns on desktop, 2 on tablet, 1 on mobile)
- Shows client name, location, type, rep, and status
- Quick alert indicators
- Click to open detail modal

### List View
- Table format with columns: Client, Phone, Type, Location, Rep, Status, Date, Alert
- 15 rows per page with pagination
- Sortable columns
- Row highlighting for urgent/warning alerts

### Kanban View
- 7 columns for each status stage
- Drag-and-drop ready (structure in place)
- Shows enquiry count per stage
- Quick preview of enquiry details

## Styling

The page uses Tailwind CSS with:
- Navy blue (`#1a3a5c`) as primary color
- Responsive design (mobile-first approach)
- Accessibility considerations (contrast ratios, semantic HTML)
- Smooth transitions and hover states
- Color-coded badges for types and statuses

## Integration with Laravel

### Route
```php
Route::inertia('enquiries', 'enquiries')->name('enquiries');
```

### Sample Data
Currently uses 35 sample enquiries with realistic data including:
- Varying status distributions
- Different property types
- Multiple lead sources
- Alert states based on timestamps

## File Management

The detail modal includes file handling:
- Upload files via click or drag-and-drop
- Max 10MB per file
- File type detection (PDF, images, documents)
- Download and remove functionality
- File references in follow-up notes

## CSV Export

The export function generates a CSV with columns:
- ID, Date, Name, Phone, Email, Source, Lead, Type, Location, Rep, Status, 1st Deposit, 2nd Deposit, Files, Notes, Follow-up

## Usage

To navigate to the enquiries page:
```
http://yoursite.com/enquiries
```

## Future Enhancements

Potential features for future development:
1. Drag-and-drop between Kanban stages
2. Bulk operations (multi-select, batch status changes)
3. Scheduled follow-ups/reminders
4. Email integration
5. Phone call logging
6. Document templates
7. Advanced reporting and analytics
8. Team performance metrics
9. Custom fields
10. Activity timeline view
