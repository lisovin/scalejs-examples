param($installPath, $toolsPath, $package, $project)

$project |
	Remove-Paths 'scalejs.statechart-scion' |
	Remove-ScalejsExtension 'scalejs.statechart-scion' |
	Remove-Shims 'scalejs.statechart-scion' |
	Out-Null
