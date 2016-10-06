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

        public testVoidFunction(): void;

        testReturnTypeFunction(): any;

        private testVoidFunctionPrivate(): void;

        propertyTestOnTheFly: { id: number };

        propertyTest: any;

        private propertyTestPrivate: string;
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
