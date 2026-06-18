export default {
	meta: {
		type: "problem",
		docs: {
			description: "Require explicit return types on class methods only",
		},
		schema: [],
		messages: {
			missingReturnType: "Class methods must have an explicit return type.",
		},
	},

	create(context) {
		return {
			MethodDefinition(node) {
				const fn = node.value;

				if (node.kind === "constructor" || node.kind === "set") {
					return;
				}

				if (!fn.returnType) {
					context.report({
						node: fn,
						messageId: "missingReturnType",
					});
				}
			},

			PropertyDefinition(node) {
				const value = node.value;

				if (!value) return;

				// On cible uniquement les fonctions
				if (value.type === "ArrowFunctionExpression" || value.type === "FunctionExpression") {
					if (!value.returnType) {
						context.report({
							node: value,
							messageId: "missingReturnType",
						});
					}
				}
			},
		};
	},
};
