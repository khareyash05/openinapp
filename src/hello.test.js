const { sayHello } = require('./hello');


					describe('Dummy tests', () => {
						it('should pass', () => {
							expect(true).toBe(true);
						});
					});

// Test generated using Keploy

    
    test('sayHello function is callable', () => {
      expect(() => sayHello()).not.toThrow();
    });

				