/**
 * Breadcrumbs Advanced Test Suite
 * ဒီ file သည် code navigation နှင့် breadcrumbs ပြသမှုပုံစံများကို စမ်းသပ်ရန်ဖြစ်သည်။
 */

// 01. Advanced Class Syntax (Static Blocks & Private Methods)
class DatabaseManager {
  #connectionString;
  static activeConnections = 0;

  static {
    try {
      this.activeConnections = 1;
    } catch (err) {
      console.error("Static init failed", err);
    }
  }

  constructor(uri) {
    this.#connectionString = uri;
  }

  #validateUri() {
    return this.#connectionString.startsWith("mongodb://");
  }

  connect() {
    const initialize = () => {
      if (this.#validateUri()) {
        console.log("Connected securely.");
      }
    };
    initialize();
  }
}

// 02. Nested Method Chaining (HOF Madness)
const transactions = [
  { id: 1, amount: 100, tags: ["crypto", "valid"] },
  { id: 2, amount: -50, tags: ["fiat", "invalid"] },
  { id: 3, amount: 300, tags: ["crypto", "valid"] },
];

const cryptoTotal = transactions
  .filter((tx) => tx.tags.includes("crypto"))
  .map((tx) => tx.amount)
  .reduce((total, amount) => total + amount, 0);

// 03. Nested Closures & Factory HOFs (Currying)
const configureEngine = (type) => (version) => {
  return function buildDriver(driverName) {
    return {
      start: function () {
        console.log(`Running ${type} v${version} via ${driverName}`);
      },
    };
  };
};

// 04. Object Literal Madness
const apiService = {
  endpoint: "https://api.v1",
  headers: {
    auth() {
      return "Bearer token_xyz";
    },
  },
  utils: {
    request: async function send(path) {
      const execute = async () => fetch(`${this.endpoint}/${path}`);
      return execute();
    },
    formatData: (raw) => raw.json(),
  },
};

// 05. Control Flow Stress Test
function heavyValidation(user) {
  if (user.isActive) {
    for (let role of user.roles) {
      if (role === "superadmin") {
        while (user.attempts > 0) {
          try {
            if (user.verifyMFACode()) break;
          } catch (mfaError) {
            user.attempts--;
          } finally {
            console.log("Attempt evaluation complete");
          }
        }
      }
    }
  } else if (user.isSuspended) {
    // Handle suspension
  } else {
    // Handle inactive
  }
}

// 06. IIFEs
(function iifeModule() {
  const privateState = "secret";

  (() => {
    console.log("Nested Anonymous IIFE executing: ", privateState);
  })();
})();

// 07. Asynchronous Chain
async function setupPluginSystem() {
  try {
    const plugin = await import("./analytics-plugin.js");

    plugin
      .initialize()
      .then((status) => {
        if (status === "SUCCESS") return plugin.fetchMeta();
      })
      .then((meta) => {
        console.log("Metadata loaded: ", meta);
      })
      .catch((err) => {
        console.error("Plugin failed chain: ", err);
      });
  } catch (err) {
    console.error("Dynamic import failed", err);
  }
}

// 08. Nested JSX Hierarchy
function DashboardComponent() {
  return (
    <div className="dashboard">
      <header className="header">
        <SidebarLayout variant="collapsible">
          <nav className="nav-links">
            <ul className="list-wrapper">
              <li className="active-item">
                <span
                  onClick={(e) => {
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
