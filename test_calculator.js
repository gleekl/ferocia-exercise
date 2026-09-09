/**
 * Borrowing Power Calculator Test Suite
 */


const assert = require('assert');
const { calculateBorrowingPower } = require('./borrowingCalculator');

describe('Borrowing Power Calculator Tests', () => {

  it('should calculate borrowing power for standard values', async () => {
    const result = await calculateBorrowingPower(120000, 2, 3000, 10000, 7.5);
    assert.ok(result.maxLoanAmount > 0, 'Should yield a positive borrowing power amount');
    assert.strictEqual(result.monthlyRepayment, 4600);
  });

  // Initial: should return 0 for invalid negative inputs
  // Adjusted as the inputs were all positive. It is the monthly repayment capacity that ends up negative:
  //    4. Calculate monthly repayment capacity
  //    const maxMonthlyRepayment = netMonthlyIncome - totalLivingExpenses - creditCardLiability; 
  it('should return 0 for negative repayment capacity', async () => {
    const result = await calculateBorrowingPower(30000, 3, 4000, 5000, 7.5);
    assert.strictEqual(result.maxLoanAmount, 0);
    assert.strictEqual(result.monthlyRepayment, 0);
  });

  it("should reject when a negative number has been inputted", async () => {
    await assert.rejects(calculateBorrowingPower(-80000, 2, 2000, 1000, 7.5));
    await assert.rejects(calculateBorrowingPower(80000, -2, 2000, 1000, 7.5));
    await assert.rejects(calculateBorrowingPower(80000, 2, -2000, 1000, 7.5));
    await assert.rejects(calculateBorrowingPower(80000, 2, 2000, -1000, 7.5));
  })

  it("should return 2 decimal numbers", async () => {
    const result = await calculateBorrowingPower(125000, 2, 8000, 7000, 7.5);
    assert.strictEqual(result.maxLoanAmount, Number(result.maxLoanAmount.toFixed(2)));
    assert.strictEqual(result.monthlyRepayment, Number(result.monthlyRepayment.toFixed(2)));
  });

  it("should return the number type", async () => {
    const result = await calculateBorrowingPower(115000, 1, 5000, 2000, 7.5);
    assert.strictEqual(typeof result.maxLoanAmount, 'number');
    assert.strictEqual(typeof result.monthlyRepayment, 'number');
  });

  it("should reject and not return a NaN when no numbers have been inputted", async () => {
    await assert.rejects(calculateBorrowingPower(10000, "", "", "", 7.5));
    await assert.rejects(calculateBorrowingPower("", 2, "", "", 7.5));
    await assert.rejects(calculateBorrowingPower("", "", 1000, "", 7.5));
    await assert.rejects(calculateBorrowingPower("", "", "", 1250, 7.5));
  })

});

