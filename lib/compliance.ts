export interface ComplianceResult {
  confirmationStatement: {
    dueDate: string
    status: 'ok' | 'due_soon' | 'overdue'
    daysRemaining: number
  }
  accounts: {
    dueDate: string
    status: 'ok' | 'due_soon' | 'overdue'
    daysRemaining: number
  }
}

// ✅ Helper functions (THIS was missing)
function getStatus(days: number): 'ok' | 'due_soon' | 'overdue' {
  if (days < 0) return 'overdue'
  if (days <= 30) return 'due_soon'
  return 'ok'
}

function diffInDays(date: Date): number {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ✅ Main function
export function calculateCompliance(data: any): ComplianceResult {
  // 🚨 Handle dissolved companies
  if (data.company_status === 'dissolved') {
    return {
      confirmationStatement: {
        dueDate: 'N/A',
        status: 'overdue',
        daysRemaining: 0,
      },
      accounts: {
        dueDate: 'N/A',
        status: 'overdue',
        daysRemaining: 0,
      },
    }
  }

  // ✅ Confirmation Statement (real logic)
  let confirmationDue: Date

  if (data.confirmation_statement?.last_made_up_to) {
    confirmationDue = new Date(data.confirmation_statement.last_made_up_to)
    confirmationDue.setFullYear(confirmationDue.getFullYear() + 1)
  } else {
    confirmationDue = new Date(data.date_of_creation)
    confirmationDue.setFullYear(confirmationDue.getFullYear() + 1)
  }

  const csDays = diffInDays(confirmationDue)

  // ✅ Accounts
  let accountsDue: Date

  if (data.accounts?.next_due) {
    accountsDue = new Date(data.accounts.next_due)
  } else {
    accountsDue = new Date(data.date_of_creation)
    accountsDue.setMonth(accountsDue.getMonth() + 21)
  }

  const accDays = diffInDays(accountsDue)

  return {
    confirmationStatement: {
      dueDate: confirmationDue.toISOString(),
      status: getStatus(csDays),
      daysRemaining: csDays,
    },
    accounts: {
      dueDate: accountsDue.toISOString(),
      status: getStatus(accDays),
      daysRemaining: accDays,
    },
  }
}