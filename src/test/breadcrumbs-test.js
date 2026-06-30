// Breadcrumbs-advanced-test.js
const fruits = ["Apple", "Banana" /* cursor here: Breadcrumbs > fruits */]; // = Same With VSCode

const person = {
  name: "John Doe",
  age: 30, // cursor here: Breadcrumbs > person = Same With VSCode
};

// ==========================================
// 01 Advanced Class Syntax (Static Blocks & Private Methods)
// ==========================================
class DatabaseManager {
  #connectionString;
  static activeConnections = 0;

  // Static Initializer Block (ES2022)
  static {
    // cursor here: Breadcrumbs > DatabaseManager = Same With VSCode
    try {
      // cursor here: Breadcrumbs > DatabaseManager = Same With VSCode
      this.activeConnections = 1;
    } catch (err) {
      // cursor here: Breadcrumbs > DatabaseManager = Same With VSCode
      console.error("Static init failed", err);
    }
  }

  constructor(uri) {
    // cursor here: Breadcrumbs > DatabaseManager > constructor = Same With VSCode
    this.#connectionString = uri;
  }

  // Private Method
  #validateUri() {
    // cursor here: Breadcrumbs > DatabaseManager > #validateUri = Same With VSCode
    return this.#connectionString.startsWith("mongodb://");
  }

  connect() {
    // cursor here: DatabaseManager > connect = Same With VSCode
    const initialize = () => {
      // cursor here: DatabaseManager > connect > initialize  = Same With VSCode
      if (this.#validateUri()) {
        // cursor here: DatabaseManager > connect > initialize = Same With VSCode
        console.log("Connected securely.");
      }
    };
    initialize();
  }
}

// ==========================================
// 02 Nested Method Chaining (HOF Madness)
// ==========================================
const transactions = [
  { id: 1, amount: 100, tags: ["crypto", "valid"] },
  { id: 2, amount: -50, tags: ["fiat", "invalid"] },
  { id: 3, amount: 300, tags: ["crypto", "valid"] },
];

const cryptoTotal = transactions
  .filter((tx) => {
    // cursor here: Breadcrumbs > filter() callback > transactions = Not Same
    // vscode result: Breadcrumbs > cryptoTotal > transactions.filter() callback
    return tx.tags.includes("crypto");
  })
  .map((tx) => {
    // cursor here: Breadcrumbs > map() callback > transactions = Not Same
    // vscode result: Breadcrumbs > cryptoTotal > map() callback

    return tx.amount;
  })
  .reduce((total, amount) => {
    // cursor here: Breadcrumbs > reduce() callback > transactions = Not Same
    // vscode result: Breadcrumbs > cryptoTotal > reduce() callback
    return total + amount;
  }, 0);

// ==========================================
// 03 Nested Closures & Factory HOFs (Currying Extreme)
// ==========================================
const configureEngine = (type) => {
  // cursor here: Breadcrumbs > configureEngine = Same With VSCode
  return (version) => {
    // cursor here: Breadcrumbs > configureEngine > icon only = Not Same
    // vscode result: Breadcrumbs > configureEngine > <function>
    return function buildDriver(driverName) {
      // cursor here: Breadcrumbs > configureEngine > icon only > buildDriver = Not Same
      // vscode result: Breadcrumbs > configureEngine > <function> > buildDriver
      return {
        start: function () {
          // cursor here: Breadcrumbs > configureEngine > icon only > buildDriver > start = Not Same
          // vscode result: Breadcrumbs > configureEngine > <function> > buildDriver > start
          console.log(`Running ${type} v${version} via ${driverName}`);
        },
      };
    };
  };
};

// ==========================================
// 04 Object Literal Madness (Mixed Methods, Getters, Arrows)
// ==========================================
const apiService = {
  endpoint: "https://api.v1",
  headers: {
    // cursor here: Breadcrumbs > apiService > headers = Same With VSCode
    auth() {
      // cursor here: Breadcrumbs > apiService > headers > (get) auth = Same With VSCode
      return "Bearer token_xyz";
    },
  },
  utils: {
    // cursor here: Breadcrumbs > apiService > utils = Same With VSCode
    request: async function send(path) {
      // cursor here: Breadcrumbs > apiService > utils > request = Same With VSCode
      const execute = async () => {
        // cursor here: Breadcrumbs > apiService > utils > request > execute = Same With VSCode
        return fetch(`${this.endpoint}/${path}`);
      };
      return execute();
    },
    formatData: (raw) => {
      // cursor here: Breadcrumbs > apiService > utils > formatData = Same With VSCode
      return raw.json();
    },
  },
};

// ==========================================
// 05 The Ultimate Control Flow Stress Test
// ==========================================
function heavyValidation(user) {
  // cursor here: Breadcrumbs > heavyValidation = Same With VSCode
  if (user.isActive) {
    // cursor here: heavyValidation
    for (let role of user.roles) {
      // cursor here: Breadcrumbs > heavyValidation = Same With VSCode
      if (role === "superadmin") {
        // cursor here: Breadcrumbs > heavyValidation = Same With VSCode
        while (user.attempts > 0) {
          // cursor here: Breadcrumbs > heavyValidation = Same With VSCode
          try {
            // cursor here: Breadcrumbs > heavyValidation = Same With VSCode
            if (user.verifyMFACode()) {
              // cursor here: Breadcrumbs > heavyValidation = Same With VSCode
              break;
            }
          } catch (mfaError) {
            // cursor here: Breadcrumbs > heavyValidation = Same With VSCode
            user.attempts--;
          } finally {
            // cursor here: Breadcrumbs > heavyValidation = Same With VSCode
            console.log("Attempt evaluation complete");
          }
        }
      } else {
        // cursor here: Breadcrumbs > heavyValidation = Same With VSCode
      }
    }
  } else if (user.isSuspended) {
    // cursor here: Breadcrumbs > heavyValidation = Same With VSCode
  } else {
    // cursor here: Breadcrumbs > heavyValidation = Same With VSCode
  }
}

// ==========================================
// 06 Immediately Invoked Function Expressions (IIFEs)
// ==========================================
(function iifeModule() {
  // cursor here: Breadcrumbs > iifeModule = Same With VSCode
  const privateState = "secret";

  (() => {
    // cursor here: Breadcrumbs > iifeModule = Same With VSCode
    // vscode result: Breadcrumbs > iifeModule
    console.log("Nested Anonymous IIFE executing: ", privateState);
  })();
})();

// ==========================================
// 07 Asynchronous Nightmare (Dynamic Imports & Promise Interceptors)
// ==========================================
async function setupPluginSystem() {
  // cursor here: Breadcrumbs > setupPluginSystem = Same With VSCode
  try {
    // cursor here: Breadcrumbs > setupPluginSystem = Same With VSCode
    const plugin = await import("./analytics-plugin.js");

    plugin
      .initialize()
      .then((status) => {
        // cursor here: Breadcrumbs > setupPluginSystem > then() callback = Same With VSCode
        // vscode result: Breadcrumbs > setupPluginSystem > then() callback
        if (status === "SUCCESS") {
          return plugin.fetchMeta();
        }
      })
      .then((meta) => {
        // cursor here: Breadcrumbs > setupPluginSystem > then() callback = Same With VSCode
        // vscode result: Breadcrumbs > setupPluginSystem > then() callback
        console.log("Metadata loaded: ", meta);
      })
      .catch((err) => {
        // cursor here: Breadcrumbs > setupPluginSystem > catch() callback = Same With VSCode
        // vscode result: Breadcrumbs > setupPluginSystem > catch() callback
        console.error("Plugin failed chain: ", err);
      });
  } catch (err) {
    // cursor here: Breadcrumbs > setupPluginSystem = Same With VSCode
    console.error("Dynamic import failed", err);
  }
}

// ==========================================
// 08 Deeply Nested JSX Hierarchy (TSX/JSX dialect test)
// ==========================================
function DashboardComponent() {
  // cursor here: Breadcrumbs > DashboardComponent = Same With VSCode
  return (
    <div className="dashboard">
      <header className="header">
        <SidebarLayout variant="collapsible">
          <nav className="nav-links">
            <ul className="list-wrapper">
              {/* Lezer Parser JSX Node Target */}
              <li className="active-item">
                {/* cursor here: Breadcrumbs > DashboardComponent > SidebarLayout = Same With VSCode */}
                <span
                  onClick={(e) => {
                    // cursor here: Breadcrumbs > DashboardComponent > SidebarLayout = Same With VSCode
                    // vscode result: Breadcrumbs > DashboardComponent > SidebarLayout
                    console.log("Clicked inside deep JSX structure", e);
                  }}
                >
                  Dashboard Home
                </span>
              </li>
            </ul>
          </nav>
        </SidebarLayout>
      </header>
    </div>
  );
}
