/**
 * Borrowing Power Calculator
 * 
 * Gen's incomplete prototype. 
 * This currently calculates what a user can borrow over 30 years.
 * Currently this code uses placeholder methods for Tax and HEM values. 
 * 
 * TODO: Refactor the code to pull Tax and HEM values from an API call.
 * A server.js has been provided to supply these values.
 */

/**
 * Loads .env into process.env
 * Link: https://nodejs.org/api/process.html#processloadenvfilepath
 */
const { loadEnvFile } = require('node:process');

loadEnvFile();

const PORT = process.env.PORT
const API_URL = `http://localhost:${PORT}`
const PERSONAL_ACCESS_TOKEN = process.env.PERSONAL_ACCESS_TOKEN

// Global constant for mortgage simulation
const LOAN_TERM_MONTHS = 360; // 30 Years
const INTEREST_RATE = 7.0; // 7.0% baseline interest rate
const ASSESSMENT_RATE_BUFFER = 3.0; // 3.0% buffer added to interest rates

function createConnection(url, token) {
    /**
     * TODO (G): Further refactor getTax() & getHEM(). Currently too repetitive and too specific -> return data.tax/return data.hem.  
     * * Current pattern: url diff endpoint/try catch fetch/return data.
     * *                  Arguments: income/income+dependents
     */
    async function handleApi(endpoint, urlParams) {
        // 1. Create new URL using base API_URL and endpoint given (/api/tax)
        // Link: https://developer.mozilla.org/en-US/docs/Web/API/URL/URL
        const url = new URL(endpoint, API_URL);

        // 2. Loop through urlParams given (income/income+dependents) to set params.
        for (const [key, value] of Object.entries(urlParams)) {
            url.searchParams.set(key, value)
        }

        try {
            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${PERSONAL_ACCESS_TOKEN}`
                }
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(`${endpoint} failed: ${res.status} ${data.error} - ${data.message || "Unknown error"}`);
            }

            return data;
        } catch (err) {
            throw new Error(err.message)
        }
    }

    async function getTax(income) {
        const data = await handleApi("/api/tax", {
            income: income
        })
        return data.tax
    }

    async function getHEM(income, dependents) {
        const data = await handleApi("/api/hem", {
            income: income,
            dependents: dependents
        })
        return data.hem
    }

    return { getTax, getHEM };
}

// Initialising connection
const apiConnection = createConnection(API_URL, PERSONAL_ACCESS_TOKEN)

/**
 * Calculates the total borrowing power amount and the monthly repayment configuration
 */
async function calculateBorrowingPower(income, dependents, expenses, creditLimits, annualAssessmentRate) {
    // * Created a test which failed. Noticed that income and dependents had safeguards against negative numbers but not expenses and credit limits. 
    for (const [name, value] of Object.entries({ income, dependents, expenses, creditLimits })) {
        if (value < 0 || typeof value !== "number") {
            throw new Error(`${name} must be a non-negative number.`)
        }
    }

    // 1. Calculate Net Monthly Income after tax deductions
    // Non-sequential approach with Promise.all() instead of 
    const [ annualTax, baselineHEM ] = await Promise.all([apiConnection.getTax(income), apiConnection.getHEM(income, dependents)]);

    const netMonthlyIncome = (income - annualTax) / 12;

    // 2. Determine living expenses (User declared expenses vs HEM baseline, whichever is higher)
    const totalLivingExpenses = Math.max(expenses, baselineHEM);
    
    // 3. Calculate credit card liability (~3% of total limits)
    const creditCardLiability = creditLimits * 0.03;

    // 4. Calculate monthly repayment capacity
    const maxMonthlyRepayment = netMonthlyIncome - totalLivingExpenses - creditCardLiability;

    // Return early if user cannot afford a loan at all
    if (maxMonthlyRepayment <= 0) {
        return { maxLoanAmount: 0, monthlyRepayment: 0 };
    }

    // 5. Calculate the monthly interest rate
    const monthlyRate = (annualAssessmentRate / 100) / 12;

    // 6. Calculate maximum borrowing power using the following formula:
    // P = M * (1 - (1 + R)^-N) / R
    const maxLoanAmount = maxMonthlyRepayment * ((1 - Math.pow(1 + monthlyRate, - LOAN_TERM_MONTHS)) / monthlyRate);

    return {
        maxLoanAmount: Number(maxLoanAmount.toFixed(2)),
        monthlyRepayment: Number(maxMonthlyRepayment.toFixed(2))
    };
}


function runConsoleMode() {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.log("Mortgage Borrowing Power Calculator");
    console.log("===================================");

    // Need to ensure that the inputs received are validated (e.g. income is a positive float, dependents is an integer, etc.)
    function validateInput(prompt, inputType, callback) {

        // 1. Ask the first question
        rl.question(prompt, (answer) => {

            // 2. Check if Current comparison is between integer and float.
            switch (inputType) {
                case "float":
                    if (parseFloat(answer) < 0 || Number.isNaN(parseFloat(answer)) || parseFloat(answer) === Infinity) {
                        console.log("Please give a non-negative number.");

                        // If invalid answer, repeat the current question
                        return validateInput(prompt, inputType, callback)
                    };
                    break;

                case "integer":
                    if (parseInt(answer) < 0 || !Number.isInteger(parseInt(answer)) || parseInt(answer) === Infinity) {
                        console.log("Please give a non-negative number.");

                        // If invalid answer, repeat the current question
                        return validateInput(prompt, inputType, callback)
                    };
                    break;
            }

            // 3. If correct, move on to next question,
            callback(answer);
        });
    };

    // With validateInput()
    validateInput("Gross Annual Income: $", "float", (income) => {
        validateInput("Number of Dependents: ", "integer", (dependents) => {
            validateInput("Declared Monthly Expenses: $", "float", (expenses) => {
                validateInput("Total Credit Card Limits: $", "float", async (creditLimits) => {
                    // Banks assess loans using base rate + buffer for safety
                    const assessmentRate = INTEREST_RATE + ASSESSMENT_RATE_BUFFER;

                    const result = await calculateBorrowingPower(
                        parseFloat(income),
                        parseInt(dependents),
                        parseFloat(expenses),
                        parseFloat(creditLimits),
                        assessmentRate
                    );

                    console.log("\n--- Calculation Summary ---");
                    console.log(`Maximum Borrowing Power at ${INTEREST_RATE}%: $${result.maxLoanAmount.toLocaleString()}`);
                    console.log(`Assumed Monthly Mortgage Repayment: $${result.monthlyRepayment.toLocaleString()} over 30 years`);

                    rl.close();
                });
            });
        });
    });
}

if (require.main === module) {
    // calculateBorrowingPower(10000, -2, 100, 1000, 7.5)
    //     .then((result) => console.log(result))
    runConsoleMode();
}

module.exports = { calculateBorrowingPower };