/**
 * Documentation for A
 */
declare module TEST {
    class A {
        /**
         * constructor documentation
         * @param a my parameter documentation
         * @param b another parameter documentation
         */
        constructor(a: string, b: A);
        testVoidFunction(): void;
        testReturnTypeFunction(): any;
        private testVoidFunctionPrivate();
        propertyTestOnTheFly: {
            id: number;
        };
        propertyTest: any;
        private propertyTestPrivate;
    }
    class B extends A {
        constructor();
    }
}
declare module TEST.TOOLS {
    class B {
        constructor();
    }
}
