function Welcome(props) {
    return <h1>Hello, world! Your index is {props.index}.</h1>;
}

const element = <Welcome index="0" />;
ReactDOM.render(
    element,
    document.getElementById('root')
);

for (var i = 1; i <= 3; i++) {
    ReactDOM.render(
        <Welcome index={i} />,
        document.getElementById('root' + i)
    );
}