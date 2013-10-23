param($installPath, $toolsPath, $package, $project)

$project |
	Remove-Paths 'scalejs.linq-linqjs, linqjs' |
	Remove-ScalejsExtension 'scalejs.linq-linqjs' |
	Out-Null
