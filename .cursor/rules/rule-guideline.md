## Best Practices for Rule Creation

### Rule Content Guidelines

1. **Be Specific**: Write clear, actionable instructions
2. **Provide Context**: Explain why the rule exists
3. **Include Examples**: Show what good and bad implementations look like
4. **Keep It Focused**: Each rule should address one specific area

### Rule Management Strategy

1. **Start Small**: Begin with 3–5 essential global rules
2. **Iterate and Refine**: Adjust rules based on real usage
3. **Document Purpose**: Always include descriptions for "Agent Decides" rules
4. **Regular Review**: Periodically assess rule effectiveness

### Recommended Global Rules

Consider starting with rules covering:

- **Code Style**: Formatting and naming conventions
- **Documentation Standards**: Comment and documentation requirements
- **Error Handling**: How to approach error management
- **Testing Practices**: Unit test and integration test guidelines
- **Security Considerations**: Basic security practices to follow

## Rule Description Best Practices

When using "Agent Decides" attachment (recommended), include clear descriptions such as:

- **Task-Based**: "Use when creating API endpoints"
- **Context-Based**: "Apply for front-end React components"
- **Problem-Based**: "Use when debugging performance issues"
- **Technology-Based**: "Apply when working with database migrations"

## Advanced Rule Usage

### Rule Hierarchies

- Global rules provide baseline behavior
- Project rules can override or extend global rules
- More specific rules take precedence over general ones

### Rule Testing

- Test new rules on small tasks first
- Monitor AI behavior changes after adding rules
- Adjust rule descriptions based on agent application patterns
